// in test/support/pages/header_page.js
define(function (require) {
  var config = require('intern').config;
  var Common = require('./common');

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
      .findDisplayedByClassName('navbar-timepicker-time-desc').click();
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
        return self.collapseTimepicker();
      });
    },

    collapseTimepicker: function collapseTimepicker() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.fa.fa-chevron-circle-up')
      .click();
    },

    getToastMessage: function getToastMessage() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findDisplayedByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .getVisibleText();
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;

      return self.remote.setFindTimeout(defaultTimeout)
        .waitForDeletedByCssSelector('kbn-truncated.toast-message');
    },

    clickToastOK: function clickToastOK() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button[ng-if="notif.accept"]')
      .click();
    },

    getSpinnerDone: function getSpinnerDone() {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout * 10)
      .findByCssSelector('.spinner.ng-hide');
    }

  };

  return HeaderPage;
});
