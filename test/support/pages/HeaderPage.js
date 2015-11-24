// in test/support/pages/HeaderPage.js
define(function (require) {
  var config = require('intern').config;
  var Common = require('./Common');

  var common;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
  }

  var defaultTimeout = config.timeouts.default;

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickSelector: function (selector) {
      var self = this.remote;
      return common.tryForTime(defaultTimeout, function () {
        return self.setFindTimeout(defaultTimeout)
        .findByCssSelector(selector)
        .then(function (tab) {
          return tab.click();
        });
      });
    },

    clickDiscover: function () {
      common.debug('click Discover tab');
      this.clickSelector('a[href*=\'discover\']');
    },

    clickVisualize: function () {
      common.debug('click Visualize tab');
      this.clickSelector('a[href*=\'visualize\']');
    },

    clickDashboard: function () {
      common.debug('click Dashboard tab');
      this.clickSelector('a[href*=\'dashboard\']');
    },

    clickSettings: function () {
      common.debug('click Settings tab');
      this.clickSelector('a[href*=\'settings\']');
    },

    clickTimepicker: function clickTimepicker() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByClassName('navbar-timepicker-time-desc').click();
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByLinkText('Absolute').click();
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .clearValue()
      .type(timeString);
    },

    setToTime: function setToTime(timeString) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .clearValue()
      .type(timeString);
    },

    clickGoButton: function clickGoButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByClassName('kbn-timepicker-go')
      .click();
    },


    setAbsoluteRange: function setAbsoluteRange(fromTime, toTime) {
      var self = this;
      common.debug('--Clicking Absolute button');
      return self.clickAbsoluteButton()
      .then(function () {
        common.debug('--Setting From Time : ' + fromTime);
        return self.setFromTime(fromTime);
      })
      .then(function () {
        common.debug('--Setting To Time : ' + toTime);
        return self.setToTime(toTime);
      })
      .then(function () {
        return self.clickGoButton();
      });
    },

    collapseTimepicker: function collapseTimepicker() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.fa.fa-chevron-up')
      .click();
    },

    getToastMessage: function getToastMessage() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .getVisibleText();
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;
      return common.tryForTime(defaultTimeout, function () {
        return self.remote.setFindTimeout(500)
        .findAllByCssSelector('kbn-truncated.toast-message')
        .then(function toastMessage(messages) {
          if (messages.length > 0) {
            common.debug('toast message found, waiting...');
            throw new Error('waiting for toast message to clear');
          } else {
            common.debug('toast message clear');
            return messages;
          }
        })
        .catch(function () {
          common.debug('toast message not found');
          return;
        });
      });
    }


  };

  return HeaderPage;
});
