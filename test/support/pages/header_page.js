import { common, remote, defaultFindTimeout } from '../';

export default (function () {

  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function HeaderPage() {
    this.remote = remote;
  }

  HeaderPage.prototype = {
    constructor: HeaderPage,

    clickSelector: function (selector) {
      var self = this;
      return common.try(function () {
        return self.remote.setFindTimeout(defaultFindTimeout)
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
      var self = this;
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByClassName('navbar-timepicker-time-desc').click();
    },

    isTimepickerOpen: function isTimepickerOpen() {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('.kbn-timepicker')
      .then(() => true)
      .catch(() => false);
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      var self = this;
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByLinkText('Absolute').click();
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .clearValue()
      .type(timeString);
    },

    setToTime: function setToTime(timeString) {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .clearValue()
      .type(timeString);
    },

    clickGoButton: function clickGoButton() {
      var self = this;
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByClassName('kbn-timepicker-go')
      .click()
      .then(function () {
        return self.getSpinnerDone();
      });
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
        return self.getSpinnerDone();
      })
      .then(function () {
        return self.collapseTimepicker();
      });
    },

    collapseTimepicker: function collapseTimepicker() {
      var self = this;
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('.fa.fa-chevron-circle-up')
      .click();
    },

    getToastMessage: function getToastMessage() {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .getVisibleText();
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;
      return self.remote.setFindTimeout(defaultFindTimeout)
        .waitForDeletedByCssSelector('kbn-truncated.toast-message');
    },

    clickToastOK: function clickToastOK() {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[ng-if="notif.accept"]')
      .click();
    },

    getSpinnerDone: function getSpinnerDone() {
      var self = this;
      return this.remote
      .setFindTimeout(defaultFindTimeout * 10)
      .findByCssSelector('.spinner.ng-hide');
    }

  };

  return HeaderPage;
}());
