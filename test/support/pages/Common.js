// in test/support/pages/Common.js
define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
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
          self.log('tryForTime success in about ' + (lastTry - start) + ' milliseconds');
          return (lastTry - start);
        })
        .catch(function tryForTimeCatch(err) {
          self.log('failed with "' + err.message + '"');
          self.log('trying again in 1/2 second');
          return Promise.delay(500).then(attempt);
        });
      }

      return Promise.try(attempt);
    },

    log: function log(logString) {
      console.log(moment().format('HH:mm:ss.SSS') + ': ' + logString);
    },

    sleep: function sleep(sleepMilliseconds) {
      var log = this.log;
      log('... sleep(' + sleepMilliseconds + ') start');

      return Promise.resolve().delay(sleepMilliseconds)
      .then(function () { log('... sleep(' + sleepMilliseconds + ') end'); })
    },

    screenshotError: function screenshotError(testSubName, reason) {
      var self = this;
      var now = Date.now();
      var filename = path.resolve('./screenshot-' + testSubName + '-ERROR-' + now + '.png');
      self.log('Test Failed, taking screenshot "' + filename + '"');
      return self.remote.takeScreenshot()
      .then(function writeScreenshot(data) {
        fs.writeFileSync(filename, data);
        throw new Error(reason);
      });
    }
  };

  return Common;
});