// Loads editme/config.csv and fills in every element that has a
// data-config attribute. Supported values:
//   data-config="annual"     -> "21st"
//   data-config="date-long"  -> "Saturday, October 3, 2026" (or "TBD")
//   data-config="year"       -> "2026"
//   data-config="show-times" -> "1:00 PM - 9:00 PM" (or "TBD")
//   data-config="gates-line" -> "Gates Open at 1:30 PM" (or "Gates Open: TBD")
// The date and time values in the config may be set to TBD.
// When the config sets betweenshows to yes, the annual number and year
// bump to next year's show and all dates/times display as TBD.
// Other scripts can wait on window.siteConfigPromise to read the raw
// config values (e.g. participants.html uses config.date for sorting).
(function () {
  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function isTBD(value) {
    return !value || value.trim().toUpperCase() === "TBD";
  }

  function parseConfig(text) {
    var config = {};
    text.split("\n").forEach(function (line) {
      line = line.trim();
      if (line === "" || line.charAt(0) === "#") {
        return;
      }
      var idx = line.indexOf(",");
      if (idx === -1) {
        return;
      }
      config[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });
    return config;
  }

  function domReady() {
    return new Promise(function (resolve) {
      if (document.readyState !== "loading") {
        resolve();
      } else {
        document.addEventListener("DOMContentLoaded", resolve);
      }
    });
  }

  async function loadSiteConfig() {
    var response = await fetch("editme/config.csv", { cache: "no-store" });
    if (response.status != 200) {
      throw new Error("Server Error");
    }
    var config = parseConfig(await response.text());
    var betweenShows = (config.betweenshows || "no").trim().toLowerCase() === "yes";

    var values = {};

    var annualNum = parseInt(config.annual, 10);
    if (!isNaN(annualNum)) {
      values["annual"] = ordinal(betweenShows ? annualNum + 1 : annualNum);
    }

    var date = new Date(config.date);
    if (betweenShows) {
      values["date-long"] = "TBD";
      if (!isNaN(date)) {
        values["year"] = String(date.getFullYear() + 1);
      }
    } else if (isTBD(config.date)) {
      values["date-long"] = "TBD";
    } else if (!isNaN(date)) {
      values["date-long"] = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      values["year"] = String(date.getFullYear());
    }

    if (betweenShows || isTBD(config.starttime) || isTBD(config.endtime)) {
      values["show-times"] = "TBD";
    } else {
      values["show-times"] = config.starttime + " - " + config.endtime;
    }

    if (betweenShows || isTBD(config.gatesopen)) {
      values["gates-line"] = "Gates Open: TBD";
    } else {
      values["gates-line"] = "Gates Open at " + config.gatesopen;
    }

    await domReady();
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var value = values[el.getAttribute("data-config")];
      if (value) {
        el.textContent = value;
      }
    });

    return config;
  }

  window.siteConfigPromise = loadSiteConfig().catch(function (e) {
    console.log(e.message);
    return {};
  });
})();
