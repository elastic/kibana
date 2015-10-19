// in test/support/pages/Common.js
define(function (require) {

  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  var Promise = require('bluebird');


  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function Common(remote) {
    this.remote = remote;
  }

  var defaultTimeout = 5000;

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
      console.log(Date.now() + ' : ' + logString);
    },


    sleep: function sleep(sleepMilliseconds) {
      var self = this;
      self.log('... sleep(' + sleepMilliseconds + ') start');
      return this.remote
        .setFindTimeout(sleepMilliseconds)
        .findByCssSelector('youWillNeverFindThis')
        .catch(function (reason) {
          self.log('... sleep(' + sleepMilliseconds + ') end');
        });

    }


    // …additional page interaction tasks…
  };

  return Common;
});