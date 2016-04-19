// in test/support/pages/common.js
define(function (require) {
  var config = require('intern').config;
  var Promise = require('bluebird');
  var moment = require('moment');
  var testSubjSelector = require('intern/dojo/node!@spalger/test-subj-selector');
  var getUrl = require('intern/dojo/node!../../utils/get_url');
  var fs = require('intern/dojo/node!fs');
  var _ = require('intern/dojo/node!lodash');
  var parse = require('intern/dojo/node!url').parse;
  var format = require('intern/dojo/node!url').format;
  var path = require('intern/dojo/node!path');
  var url = require('intern/dojo/node!url');
//  var runElasticdump  = require('../run_elasticdump');
  const exec = require('intern/dojo/node!child_process').exec;
  const execSync = require('intern/dojo/node!child_process').execSync;
  const resolve = require('intern/dojo/node!path').resolve;
  var __dirname = path.resolve(path.dirname());
  const bin = resolve(__dirname, '../../node_modules/.bin/elasticdump');
  const esUrl = 'http://localhost:9200'; //url.format(config.servers.elasticsearch);
  const kIndex = '.kibana';


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
      // navUrl includes user:password@ for use with Shield
      // appUrl excludes user:password@ to match what getCurrentUrl returns
      //var navUrl = getUrl(config.servers.kibana, config.apps[appName]);
      var appUrl = getUrl.noAuth(config.servers.kibana, config.apps[appName]);
      var navUrl = appUrl;
      self.debug('navigating to ' + appName + ' url: ' + navUrl);

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
            currentUrl = currentUrl.replace(/\/\/\w+:\w+@/, '//');
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

      return doNavigation(navUrl)
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
    },


    /////////////////// WORKS BUT UGLY /////////////////////////
    getKibanaObject: function getKibanaObject(type, objName) {
      var self = this;
      var esUrl = url.format(config.servers.elasticsearch);
      var kObject;
      return this.remote.get(esUrl + '/.kibana/' + type + '/_search?q=title:' + objName)
      .then(function () {
        return self.remote
        .findByCssSelector('body > pre')
        .getVisibleText();
      })
      .then(function (pageBody) {
        var obj1 = JSON.parse(pageBody);
        kObject = obj1.hits.hits[0]._source;
        self.debug('kObject.title = ' + kObject.title);
        return self.remote.goBack();
      })
      .then(function () {
        return kObject;
      });
    },

    execCommand: function execCommand(command) {
      var self = this;
      var kObject;
      var result = execSync(command, {encoding: 'utf8'});
      console.log('execCommand: ' + command);
      return result;
    },

    elasticDump: function elasticDump(index, file) {
      var self = this;
      var esUrl = 'http://localhost:9200'; //url.format(config.servers.elasticsearch);
      var commandMapping;
      var commandData;
      var platform = this.remote.session.capabilities.platform;
      this.debug('Platform = ' + platform);
      if (platform === 'WINDOWS') {
        commandMapping = 'cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=' + esUrl + '/' + index + ' --output=mapping-' + file  + '  --type=mapping"';
        commandData = 'cmd.exe /c "node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=' + esUrl + '/' + index + ' --output=' + file  + '  --type=data"';
      } else {
        commandMapping = 'node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=' + esUrl + '/' + index + ' --output=mapping-' + file  + '  --type=mapping';
        commandData = 'node c:\\git\\elasticsearch-dump\\bin\\elasticdump'
        + ' --input=' + esUrl + '/' + index + ' --output=' + file  + '  --type=data';
      }
      this.execCommand(commandMapping).toString('utf8');
      this.execCommand(commandData).toString('utf8');
    }
    //
    // elasticdump: function () {
    //   var err;
    //   var stdout;
    //   var stderr;
    //   return new Promise(function (resolve, reject) {
    //     exec('cmd.exe C:\node_modules\.bin\elasticdump--input=http://localhost:9200/.kibana --output=$',
    //      (err, stdout, stderr)
    //       .then(function () {
    //         this.debug('WE MADE IT HERE ');
    //         if (err) {
    //           reject(err);
    //         } else {
    //           resolve({ stdout, stderr });
    //         }
    //       })
    //     );
    //   });
    // }
    //





    // elasticdumpx: function () {
    //   var self = this;
    //   var platform = this.remote.session.capabilities.platform;
    //   this.debug('Platform = ' + platform);
    //   if (platform === 'WINDOWS') {
    //     self.debug('execFileSync cmd.exe ' + bin + '--input=http://localhost:9200/.kibana'
    //
    //      + ' ' + '--output=$');
    //     execFileSync('cmd.exe', [
    //       bin,
    //       '--input=http://localhost:9200/.kibana',
    //       '--output=$'
    //       // '--input=' + esUrl + '/' + kIndex + '',
    //       // '--output=$' // write output to stdout
    //     ]).toString('utf8');
    //   } else {
    //     return execFileSync(bin, [
    //       '--input=http://localhost:9200/.kibana',
    //       '--output=$'
    //
    //       // '--input=' + esUrl + '/' + kIndex + '',
    //       // '--output=$' // write output to stdout
    //     ]).toString('utf8');
    //   }
    // }

  };

  return Common;
});
