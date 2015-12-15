// in test/support/pages/Common.js
define(function (require) {
  var config = require('intern').config;
  var Promise = require('bluebird');
  var moment = require('moment');
  var testSubjSelector = require('intern/dojo/node!@spalger/test-subj-selector');
  var getUrl = require('intern/dojo/node!../../utils/getUrl');
  var fs = require('intern/dojo/node!fs');
  var path = require('intern/dojo/node!path');

  function Common(remote) {
    this.remote = remote;
  }

  var defaultTimeout = config.timeouts.default;

  Common.prototype = {
    constructor: Common,

    navigateToApp: function (appName, testStatusPage) {
      var self = this;
      var appUrl = getUrl(config.servers.kibana, config.apps[appName]);
      self.debug('navigating to ' + appName + ' url: ' + appUrl);

      var doNavigation = function (url) {
        return self.tryForTime(defaultTimeout, function () {
          // since we're using hash URLs, always reload first to force re-render
          return self.remote.get(url)
          .then(function () {
            return self.remote.refresh();
          })
          .then(function () {
            if (testStatusPage !== false) {
              return self.checkForKibanaApp()
              .then(function (kibanaLoaded) {
                if (!kibanaLoaded) {
                  var msg = 'Kibana is not loaded, retrying';
                  self.debug(msg);
                  throw new Error(msg);
                }
              });
            }
          })
          .then(function () {
            return self.remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            var navSuccessful = new RegExp(appUrl).test(currentUrl);
            if (!navSuccessful) {
              var msg = 'App failed to load: ' + appName +
              ' in ' + defaultTimeout + 'ms' +
              ' currentUrl = ' + currentUrl;
              self.debug(msg);
              throw new Error(msg);
            }

            return currentUrl;
          });
        });
      };

      return doNavigation(appUrl)
      .then(function (currentUrl) {
        var lastUrl = currentUrl;
        return self.tryForTime(defaultTimeout, function () {
          // give the app time to update the URL
          return self.sleep(500)
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

    runScript: function (fn, timeout) {
      var self = this;
      // by default, give the app 10 seconds to load
      timeout = timeout || 10000;

      // wait for deps on window before running script
      return self.remote
      .setExecuteAsyncTimeout(timeout)
      .executeAsync(function (done) {
        var interval = setInterval(function () {
          var ready = (document.readyState === 'complete');
          var hasJQuery = !!window.$;

          if (ready && hasJQuery) {
            console.log('doc ready, jquery loaded');
            clearInterval(interval);
            done();
          }
        }, 10);
      }).then(function () {
        return self.remote.execute(fn);
      });
    },

    getApp: function () {
      var self = this;

      return self.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.content > .application')
      .then(function () {
        return self.runScript(function () {
          var $ = window.$;
          var $scope = $('.content > .application').scope();
          return $scope ? $scope.chrome.getApp() : {};
        });
      });
    },

    checkForKibanaApp: function () {
      var self = this;

      return self.getApp()
      .then(function (app) {
        var appId = app.id;
        self.debug('current application: ' + appId);
        return appId === 'kibana';
      })
      .catch(function (err) {
        self.debug('kibana check failed');
        self.debug(err);
        // not on the kibana app...
        return false;
      });
    },

    tryForTime: function (timeout, block) {
      var self = this;
      var start = Date.now();
      var retryDelay = 500;
      var lastTry = 0;
      var tempMessage;

      function attempt() {
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          throw new Error('timeout ' + tempMessage);
        }

        return Promise
        .try(block)
        .catch(function tryForTimeCatch(err) {
          self.debug('tryForTime failure: ' + err.message);
          tempMessage = err.message;
          return Promise.delay(retryDelay).then(attempt);
        });
      }

      return Promise.try(attempt);
    },

    log: function (logString) {
      console.log(moment().format('HH:mm:ss.SSS') + ': ' + logString);
    },

    debug: function (logString) {
      if (config.debug) this.log(logString);
    },

    sleep: function (sleepMilliseconds) {
      this.debug('sleeping for ' + sleepMilliseconds + 'ms');
      return Promise.resolve().delay(sleepMilliseconds);
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

    saveScreenshot: function (filename) {
      var self = this;
      var outDir = path.resolve('test', 'output');

      return self.remote.takeScreenshot()
      .then(function writeScreenshot(data) {
        var filepath = path.resolve(outDir, filename);
        self.debug('Taking screenshot "' + filepath + '"');
        fs.writeFileSync(filepath, data);
      })
      .catch(function (err) {
        self.log('SCREENSHOT FAILED: ' + err);
      });
    },

    findTestSubject: function findTestSubject(selector) {
      this.debug('in findTestSubject: ' + selector);
      return this.remote.findByCssSelector(testSubjSelector(selector));
    }
  };

  return Common;
});
