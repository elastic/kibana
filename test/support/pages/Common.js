// in test/support/pages/Common.js
define(function (require) {
  var config = require('intern').config;
  var Promise = require('bluebird');
  var moment = require('moment');
  var fs = require('intern/dojo/node!fs');
  var path = require('intern/dojo/node!path');

  function Common(remote) {
    this.remote = remote;
  }

  Common.prototype = {
    constructor: Common,

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
        var filename = path.resolve(['./screenshot', now, testName, '.png'].join('_'));

        return self.saveScreenshot(filename)
        .then(function () {
          throw new Error(reason);
        });
      };
    },

    saveScreenshot: function saveScreenshot(filename) {
      this.debug('Test Failed, taking screenshot "' + filename + '"');

      return this.remote.takeScreenshot()
      .then(function writeScreenshot(data) {
        fs.writeFileSync(filename, data);
      });
    }
  };

  return Common;
});