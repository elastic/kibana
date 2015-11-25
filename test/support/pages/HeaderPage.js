// in test/support/pages/HeaderPage.js
define(function (require) {

  var Common = require('./Common');

  var common;

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
  }

  var defaultTimeout = 5000;

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickSelector: function (selector) {
      var self = this.remote;
      return common.tryForTime(5000, function () {
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
      common.debug('clickTimepicker');
      return self.clickTimepicker()
      .then(function () {
        common.debug('--Clicking Absolute button');
        return self.clickAbsoluteButton();
      })
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
      })
      .then(function () {
        self.collapseTimepicker();
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
      return common.tryForTime(defaultTimeout * 5, function tryingForTime() {
        return self.remote.setFindTimeout(1000)
        .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .then(function toastMessage(messages) {
          if (messages.length > 0) {
            throw new Error('waiting for toast message to clear');
          } else {
            common.debug('now messages = 0 "' + messages + '"');
            return messages;
          }
        });
      });
    },

    getSpinnerDone: function getSpinnerDone() {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout * 10)
      .findByCssSelector('span.spinner.ng-hide');
      // .then(function () {
      //   return self.remote
      //   .setFindTimeout(defaultTimeout * 10)
      //   .findByCssSelector('div.spinner.large.ng-hide');
      // });
    }

  };

  return HeaderPage;
});
