import { common, config, defaultTimeout, remote } from '../';

export default (function () {
  var Promise = require('bluebird');
  var moment = require('moment');
  var testSubjSelector = require('@spalger/test-subj-selector');
  var getUrl = require('../../utils/get_url');
  var fs = require('fs');
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

    async navigateToApp(appName, testStatusPage) {
      // navUrl includes user:password@ for use with Shield
      // appUrl excludes user:password@ to match what getCurrentUrl returns
      var navUrl = getUrl(config.servers.kibana, config.apps[appName]);
      var appUrl = getUrl.noAuth(config.servers.kibana, config.apps[appName]);
      this.debug('navigating, app: %j url: %j', appName, navUrl);

      const navigate = async () => {
        await this.remote.get(navUrl);
        await this.remote.refresh();

        if (testStatusPage !== false) {
          this.debug('checking that application is kibana, not status page');
          if (!await this.checkAppIsKibana()) {
            throw new Error('App is not kibana, retrying');
          }
        }
      };

      const verifyPropertyNavigation = async () => {
        let currentUrl = await this.remote.getCurrentUrl();
        currentUrl = currentUrl.replace(/\/\/\w+:\w+@/, '//');

        if (!currentUrl.includes(appUrl)) {
          throw new Error(
            `App failed to load: "${appName}"\n` +
            `  appUrl = ${appUrl}\n` +
            `  currentUrl = ${currentUrl}`
          );
        }
      };

      await this.try(async () => {
        await navigate();
        await this.waitForUrlToStabilize();
        await verifyPropertyNavigation();
      });
    },

    async waitForUrlToStabilize(pauseMs = 500) {
      let prevUrl;
      let curUrl;

      do {
        if (prevUrl) {
          this.debug('waiting for url to stabilize');
          this.sleep(pauseMs);
        }

        prevUrl = curUrl;
        curUrl = await this.remote.getCurrentUrl();
      } while (prevUrl !== curUrl);
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
      .findByCssSelector('.app-wrapper .application')
      .then(function () {
        return self.runScript(function () {
          var $ = window.$;
          var $scope = $('.app-wrapper .application').scope();
          return $scope ? $scope.chrome.getApp() : {};
        });
      });
    },

    checkAppIsKibana() {
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
        self.debug('tryForTime starting attempt');
        lastTry = Date.now();

        if (lastTry - start > timeout) {
          throw new Error('timeout ' + tempMessage);
        }

        return Promise
        .try(block)
        .then(() => self.debug('tryForTime success'))
        .catch(function tryForTimeCatch(err) {
          self.debug('tryForTime failure: ' + err.message);
          tempMessage = err.message;
          return Promise.delay(retryDelay).then(attempt);
        });
      }

      return Promise.try(attempt);
    },

    try(block) {
      return this.tryForTime(defaultTimeout, block);
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

    handleError: function (testObj) {
      var self = this;
      var testName = (testObj.parent) ? [testObj.parent.name, testObj.name].join('_') : testObj.name;

      return function (reason) {
        var now = Date.now();
        var filename = ['failure', now, testName].join('_') + '.png';

        return self.saveScreenshot(filename)
        .finally(function () {
          throw reason;
        });
      };
    },

    saveScreenshot: function saveScreenshot(filename) {
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
      this.debug('in findTestSubject: ' + testSubjSelector(selector));
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findDisplayedByCssSelector(testSubjSelector(selector));
    }
  };

  return Common;
}());
