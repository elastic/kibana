
import {
  defaultFindTimeout
} from '../';

import PageObjects from './';

export default class HeaderPage {

  init(remote) {
    this.remote = remote;
  }

  clickSelector(selector) {
    return this.try(() => {
      return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(selector)
      .then(tab => {
        return tab.click();
      });
    });
  }

  clickDiscover() {
    PageObjects.common.debug('click Discover tab');
    this.clickSelector('a[href*=\'discover\']');
  }

  clickVisualize() {
    PageObjects.common.debug('click Visualize tab');
    this.clickSelector('a[href*=\'visualize\']');
  }

  clickDashboard() {
    PageObjects.common.debug('click Dashboard tab');
    this.clickSelector('a[href*=\'dashboard\']');
  }

  clickSettings() {
    PageObjects.common.debug('click Settings tab');
    this.clickSelector('a[href*=\'settings\']');
  }

  clickTimepicker() {
    return PageObjects.common.findTestSubject('globalTimepickerButton')
    .click();
  }

  isTimepickerOpen() {
    return this.remote.setFindTimeout(2000)
    .findDisplayedByCssSelector('.kbn-timepicker')
    .then(() => true)
    .catch(() => false);
  }

  clickAbsoluteButton() {
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
    let self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByClassName('kbn-timepicker-go')
    .click()
    .then(function () {
      return self.isGlobalLoadingIndicatorHidden();
    });
  }

  setAbsoluteRange(fromTime, toTime) {
    PageObjects.common.debug('clickTimepicker');
    return this.clickTimepicker()
    .then(() => {
      PageObjects.common.debug('--Clicking Absolute button');
      return this.clickAbsoluteButton();
    })
    .then(() => {
      PageObjects.common.debug('--Setting From Time : ' + fromTime);
      return this.setFromTime(fromTime);
    })
    .then(() => {
      PageObjects.common.debug('--Setting To Time : ' + toTime);
      return this.setToTime(toTime);
    })
    .then(() => {
      return this.clickGoButton();
    })
    .then(() => {
      return this.isGlobalLoadingIndicatorHidden();
    });
  }

  getToastMessage() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findDisplayedByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
    .getVisibleText();
  }

  waitForToastMessageGone() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .waitForDeletedByCssSelector('kbn-truncated.toast-message');
  }

  clickToastOK() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button[ng-if="notif.accept"]')
    .click();
  }

  isGlobalLoadingIndicatorHidden() {
    return this.remote.setFindTimeout(defaultFindTimeout * 10)
    .findByCssSelector('[data-test-subj="globalLoadingIndicator"].ng-hide');
  }

}
