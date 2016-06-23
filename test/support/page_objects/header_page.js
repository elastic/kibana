
import Common from './common.js';
import { defaultFindTimeout } from '../';

export default class HeaderPage extends Common {

  constructor() {
    super();
  }

  init(remote) {
    super.init(remote);
  }

  clickSelector(selector) {
    var self = this;
    return this.try(function () {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(selector)
      .then(function (tab) {
        return tab.click();
      });
    });
  }

  clickDiscover() {
    this.debug('click Discover tab');
    this.clickSelector('a[href*=\'discover\']');
  }

  clickVisualize() {
    this.debug('click Visualize tab');
    this.clickSelector('a[href*=\'visualize\']');
  }

  clickDashboard() {
    this.debug('click Dashboard tab');
    this.clickSelector('a[href*=\'dashboard\']');
  }

  clickSettings() {
    this.debug('click Settings tab');
    this.clickSelector('a[href*=\'settings\']');
  }

  clickTimepicker() {
    var self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findDisplayedByClassName('navbar-timepicker-time-desc').click();
  }

  isTimepickerOpen() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findDisplayedByCssSelector('.kbn-timepicker')
    .then(() => true)
    .catch(() => false);
  }

  clickAbsoluteButton() {
    var self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByLinkText('Absolute').click();
  }

  setFromTime(timeString) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model=\'absolute.from\']')
    .clearValue()
    .type(timeString);
  }

  setToTime(timeString) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model=\'absolute.to\']')
    .clearValue()
    .type(timeString);
  }

  clickGoButton() {
    var self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByClassName('kbn-timepicker-go')
    .click()
    .then(function () {
      return self.getSpinnerDone();
    });
  }


  setAbsoluteRange(fromTime, toTime) {
    this.debug('clickTimepicker');
    return this.clickTimepicker()
    .then(() => {
      this.debug('--Clicking Absolute button');
      return this.clickAbsoluteButton();
    })
    .then(() => {
      this.debug('--Setting From Time : ' + fromTime);
      return this.setFromTime(fromTime);
    })
    .then(() => {
      this.debug('--Setting To Time : ' + toTime);
      return this.setToTime(toTime);
    })
    .then(() => {
      return this.clickGoButton();
    })
    .then(() => {
      return this.getSpinnerDone();
    })
    .then(() => {
      return this.collapseTimepicker();
    });
  }

  collapseTimepicker() {
    var self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('.fa.fa-chevron-circle-up')
    .click();
  }

  getToastMessage() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findDisplayedByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
    .getVisibleText();
  }

  waitForToastMessageGone() {
    var self = this;
    return self.remote.setFindTimeout(defaultFindTimeout)
      .waitForDeletedByCssSelector('kbn-truncated.toast-message');
  }

  clickToastOK() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button[ng-if="notif.accept"]')
    .click();
  }

  getSpinnerDone() {
    var self = this;
    return this.remote
    .setFindTimeout(defaultFindTimeout * 10)
    .findByCssSelector('.spinner.ng-hide');
  }

}
