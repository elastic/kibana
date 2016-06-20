// in test/support/pages/common.js
define(function (require) {
  var config = require('intern').config;
  var Promise = require('bluebird');
  var moment = require('moment');
  var testSubjSelector = require('intern/dojo/node!@spalger/test-subj-selector');
  var getUrl = require('intern/dojo/node!../../utils/getUrl');
  var fs = require('intern/dojo/node!fs');
  var _ = require('intern/dojo/node!lodash');
  var parse = require('intern/dojo/node!url').parse;
  var format = require('intern/dojo/node!url').format;
  var path = require('intern/dojo/node!path');

  function injectTimestampQuery(func, url) {
    var formatted = modifyQueryString(url, function (parsed) {
      parsed.query._t = Date.now();
    });
    return func.call(this, formatted);
  }

  function removeTimestampQuery(func) {
    return func.call(this)
    .then(function (url) {
      return modifyQueryString(url, function (parsed) {
        parsed.query = _.omit(parsed.query, '_t');
      });
    });
  }

  function modifyQueryString(url, func) {
    var parsed = parse(url, true);
    if (parsed.query === null) {
      parsed.query = {};
    }
    func(parsed);
    return format(_.pick(parsed, 'protocol', 'hostname', 'port', 'pathname', 'query', 'hash', 'auth'));
  }

  function Common(remote) {
    this.remote = remote;
    if (remote.get.wrapper !== injectTimestampQuery) {
      this.remote.get = _.wrap(this.remote.get, injectTimestampQuery);
      remote.get.wrapper = injectTimestampQuery;
      this.remote.getCurrentUrl = _.wrap(this.remote.getCurrentUrl, removeTimestampQuery);
    }
  }


  var defaultTimeout = config.timeouts.default;

  Common.prototype = {
    constructor: Common,

    getHostPort: function getHostPort() {
      return getUrl.baseUrl(config.servers.kibana);
    },

    navigateToApp: function (appName, testStatusPage) {
      var self = this;
      var appUrl = getUrl.noAuth(config.servers.kibana, config.apps[appName]);
      self.debug('navigating to ' + appName + ' url: ' + appUrl);

      var doNavigation = function (url) {
        return self.tryForTime(defaultTimeout, function () {
          // since we're using hash URLs, always reload first to force re-render
          self.debug('navigate to: ' + url);
          return self.remote.get(url)
          .then(function () {
            self.debug('returned from get, calling refresh');
            return self.remote.refresh();
          })
          .then(function () {
            self.debug('check testStatusPage');
            if (testStatusPage !== false) {
              self.debug('self.checkForKibanaApp()');
              return self.checkForKibanaApp()
              .then(function (kibanaLoaded) {
                self.debug('kibanaLoaded = ' + kibanaLoaded);
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
              ' appUrl = ' + appUrl +
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
          return self.sleep(501)
          .then(function () {
            return self.remote.getCurrentUrl();
          })
          .then(function (currentUrl) {
            self.debug('in doNavigation url = ' + currentUrl);
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
      var retryDelay = 502;
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
      var outDir = path.resolve('test', 'screenshots');

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
