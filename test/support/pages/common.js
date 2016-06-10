import { config, defaultTryTimeout, defaultFindTimeout, remote, shieldPage } from '../';
import fs from 'fs';
import mkdirp from 'mkdirp';
import { promisify } from 'bluebird';

const mkdirpAsync = promisify(mkdirp);
const writeFileAsync = promisify(fs.writeFile);

export default (function () {
  var Promise = require('bluebird');
  var moment = require('moment');
  var testSubjSelector = require('@spalger/test-subj-selector');
  var getUrl = require('../../utils/get_url');
  var _ = require('lodash');
  var parse = require('url').parse;
  var format = require('url').format;
  var util = require('util');
  var path = require('path');

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

  function Common() {
    this.remote = remote;
    if (remote.get.wrapper !== injectTimestampQuery) {
      this.remote.get = _.wrap(this.remote.get, injectTimestampQuery);
      remote.get.wrapper = injectTimestampQuery;
      this.remote.getCurrentUrl = _.wrap(this.remote.getCurrentUrl, removeTimestampQuery);
    }
  }

  Common.prototype = {
    constructor: Common,

    getHostPort: function getHostPort() {
      return getUrl.baseUrl(config.servers.kibana);
    },

    getEsHostPort: function getHostPort() {
      return getUrl.baseUrl(config.servers.elasticsearch);
    },

    navigateToApp: function (appName, testStatusPage) {
      var self = this;
      // navUrl includes user:password@ for use with Shield
      // appUrl excludes user:password@ to match what getCurrentUrl returns
      var navUrl = getUrl(config.servers.kibana, config.apps[appName]);
      var appUrl = getUrl.noAuth(config.servers.kibana, config.apps[appName]);
      self.debug('navigating to ' + appName + ' url: ' + navUrl);

      var doNavigation = function (url) {
        return self.try(function () {
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
            var loginPage = new RegExp('login').test(currentUrl);
            if (loginPage) {
              self.debug('Found loginPage = ' + loginPage + ', username = '
                + config.servers.kibana.shield.username);
              return shieldPage.login(config.servers.kibana.shield.username,
                config.servers.kibana.shield.password)
              .then(function () {
                return self.remote.getCurrentUrl();
              });
            } else {
              return currentUrl;
            }
          })
          .then(function (currentUrl) {
            currentUrl = currentUrl.replace(/\/\/\w+:\w+@/, '//');
            var navSuccessful = new RegExp(appUrl).test(currentUrl);
            if (!navSuccessful) {
              var msg = 'App failed to load: ' + appName +
              ' in ' + defaultFindTimeout + 'ms' +
              ' appUrl = ' + appUrl +
              ' currentUrl = ' + currentUrl;
              self.debug(msg);
              throw new Error(msg);
            }

            return currentUrl;
          });
        });
      };

      return doNavigation(navUrl)
      .then(function (currentUrl) {
        var lastUrl = currentUrl;
        return self.try(function () {
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

      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.app-wrapper .application')
      .then(function () {
        return self.runScript(function () {
          var $ = window.$;
          var $scope = $('.app-wrapper .application').scope();
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

    try(block) {
      return this.tryForTime(defaultTryTimeout, block);
    },

    log(...args) {
      console.log(moment().format('HH:mm:ss.SSS') + ':', util.format(...args));
    },

    debug(...args) {
      if (config.debug) this.log(...args);
    },

    sleep: function sleep(sleepMilliseconds) {
      var self = this;
      self.debug('... sleep(' + sleepMilliseconds + ') start');

      return Promise.resolve().delay(sleepMilliseconds)
      .then(function () { self.debug('... sleep(' + sleepMilliseconds + ') end'); });
    },

    handleError(testObj) {
      const testName = (testObj.parent) ? [testObj.parent.name, testObj.name].join('_') : testObj.name;
      return reason => {
        const now = Date.now();
        const fileName = `failure_${now}_${testName}.png`;

        return this.saveScreenshot(fileName, true)
        .then(function () {
          throw reason;
        });
      };
    },

    async saveScreenshot(fileName, isFailure = false) {
      try {
        const directoryName = isFailure ? 'failure' : 'session';
        const directoryPath = path.resolve(`test/screenshots/${directoryName}`);
        const filePath = path.resolve(directoryPath, fileName);
        this.debug(`Taking screenshot "${filePath}"`);

        const screenshot = await this.remote.takeScreenshot();
        await mkdirpAsync(directoryPath);
        await writeFileAsync(filePath, screenshot);
      } catch (err) {
        this.log(`SCREENSHOT FAILED: ${err}`);
      }
    },

    findTestSubject: function findTestSubject(selector) {
      this.debug('in findTestSubject: ' + testSubjSelector(selector));
      return this.remote
        .setFindTimeout(defaultFindTimeout)
        .findDisplayedByCssSelector(testSubjSelector(selector));
    }

  };

  return Common;
}());
