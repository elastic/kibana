// in test/support/pages/Common.js
define(function (require) {
  var config = require('intern').config;
  var Promise = require('bluebird');
  var moment = require('moment');
  var getUrl = require('intern/dojo/node!../../utils/getUrl');
  var fs = require('intern/dojo/node!fs');
  var path = require('intern/dojo/node!path');

  function Common(remote) {
    this.remote = remote;
  }

  Common.prototype = {
    constructor: Common,

    navigateToApp: function (appName, testStatusPage) {
      var self = this;
      var urlTimeout = 10000;
      var appUrl = getUrl(config.servers.kibana, config.apps[appName]);

      var doNavigation = function (url) {
        return self.tryForTime(urlTimeout, function () {
          // since we're using hash URLs, always reload first to force re-render
          return self.remote.refresh()
          .then(function () {
            return self.remote.get(url)
          })
          .then(function () {
            if (testStatusPage !== false) {
              return self.checkForStatusPage()
              .then(function (onStatusPage) {
                if (onStatusPage) throw new Error('Hit status page, retrying');
              });
            }
          })
          .then(function () {
            return self.remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            var navSuccessful = new RegExp(appUrl).test(currentUrl);
            if (!navSuccessful) throw new Error('App failed to load: ' + appName);
          })
        });
      };

      return doNavigation(appUrl)
      .then(function () {
        return self.remote.getCurrentUrl();
      })
      .then(function (currentUrl) {
        var lastUrl = currentUrl;
        return self.tryForTime(urlTimeout, function () {
          // give the app time to update the URL
          return self.sleep(1000)
          .then(function () {
            return self.remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            if (lastUrl !== currentUrl) {
              lastUrl = currentUrl;
              throw new Error('URL changed, waiting for it to settle');
            }
          });
        });
      });
    },

    checkForStatusPage: function () {
      var self = this;

      self.debug('Checking for status page');
      return self.remote.setFindTimeout(2000)
      .findByCssSelector('.application .container h1').getVisibleText()
      .then(function (text) {
        if (text.match(/status\:/i)) return true;
        return false;
      })
      .catch(function (err) {
        self.debug('Status page title not found');
        return false;
      });
    },

    tryForTime: function tryForTime(timeout, block) {
      var self = this;
      var start = Date.now();
      var lastTry = 0;

      function attempt() {
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          throw new Error('timeout');
        }

        return Promise
        .try(block)
        .then(function tryForTimeSuccess() {
          self.debug('tryForTime success in about ' + (lastTry - start) + ' milliseconds');
          return (lastTry - start);
        })
        .catch(function tryForTimeCatch(err) {
          self.debug('failed with "' + err.message + '"');
          self.debug('trying again in 1/2 second');
          return Promise.delay(500).then(attempt);
        });
      }

      return Promise.try(attempt);
    },

    log: function log(logString) {
      console.log(moment().format('HH:mm:ss.SSS') + ': ' + logString);
    },

    debug: function debug(logString) {
      if (config.debug) this.log(logString);
    },

    sleep: function sleep(sleepMilliseconds) {
      var self = this;
      self.debug('... sleep(' + sleepMilliseconds + ') start');

      return Promise.resolve().delay(sleepMilliseconds)
      .then(function () { self.debug('... sleep(' + sleepMilliseconds + ') end'); });
    },

    handleError: function (testObj) {
      var self = this;
      var testName = (testObj.parent) ? [testObj.parent.name, testObj.name].join('_') : testObj.name;

      return function (reason) {
        var now = Date.now();
        var filename = ['failure', now, testName].join('_') + '.png';

        return self.saveScreenshot(filename)
        .finally(function () {
          throw new Error(reason);
        });
      };
    },

    saveScreenshot: function saveScreenshot(filename) {
      var self = this;
      var outDir = path.resolve('test', 'output');

      return self.remote.takeScreenshot()
      .then(function writeScreenshot(data) {
        var filepath = path.resolve(outDir, filename);
        self.debug('Test Failed, taking screenshot "' + filepath + '"');
        fs.writeFileSync(filepath, data);
      })
      .catch(function (err) {
        self.log('SCREENSHOT FAILED: ' + err);
      });
    }
  };

  return Common;
});