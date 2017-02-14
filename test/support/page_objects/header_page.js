
import {
  defaultFindTimeout
} from '../';

import PageObjects from './';

export default class HeaderPage {

  init(remote) {
    this.remote = remote;
  }

  clickSelector(selector) {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(selector)
      .then(tab => {
        return tab.click();
      });
  }

  clickDiscover() {
    PageObjects.common.debug('click Discover tab');
    this.clickSelector('a[href*=\'discover\']');
    return PageObjects.common.sleep(3000);
  }

  clickVisualize() {
    PageObjects.common.debug('click Visualize tab');
    this.clickSelector('a[href*=\'visualize\']');
    return PageObjects.common.sleep(3000);
  }

  clickDashboard() {
    PageObjects.common.debug('click Dashboard tab');
    this.clickSelector('a[href*=\'dashboard\']');
    return PageObjects.common.sleep(3000);
  }

  clickSettings() {
    PageObjects.common.debug('click Settings tab');
    this.clickSelector('a[href*=\'settings\']');
  }

  clickTimepicker() {
    return PageObjects.common.try(() => {
      return PageObjects.common.findTestSubject('globalTimepickerButton')
        .click();
    });
  }

  clickQuickButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByLinkText('Quick').click();
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

  clickQuickButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByLinkText('Quick').click();
  }

  async getFromTime(timeString) {
    await this.ensureTimePickerIsOpen();
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .getProperty('value');
  }

  async getToTime(timeString) {
    await this.ensureTimePickerIsOpen();
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .getProperty('value');
  }

  async getFromTime() {
    await this.ensureTimePickerIsOpen();
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .getProperty('value');
  }

  async getToTime() {
    await this.ensureTimePickerIsOpen();
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .getProperty('value');
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
    const self = this;
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByClassName('kbn-timepicker-go')
    .click()
    .then(function () {
      return self.isGlobalLoadingIndicatorHidden();
    });
  }

  async ensureTimePickerIsOpen() {
    const isOpen = await PageObjects.header.isTimepickerOpen();
    PageObjects.common.debug(`time picker open: ${isOpen}`);
    if (!isOpen) {
      PageObjects.common.debug('--Opening time picker');
      await PageObjects.header.clickTimepicker();
    }
  }

  async setAbsoluteRange(fromTime, toTime) {
    PageObjects.common.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
    await this.ensureTimePickerIsOpen();
    PageObjects.common.debug('--Clicking Absolute button');
    await this.clickAbsoluteButton();
    PageObjects.common.debug('--Setting From Time : ' + fromTime);
    await this.setFromTime(fromTime);
    PageObjects.common.debug('--Setting To Time : ' + toTime);
    await this.setToTime(toTime);
    await this.clickGoButton();
    await this.isGlobalLoadingIndicatorHidden();
  }

  async setQuickTime(quickTime) {
    await this.ensureTimePickerIsOpen();
    PageObjects.common.debug('--Clicking Quick button');
    await this.clickQuickButton();
    await this.remote.setFindTimeout(defaultFindTimeout)
      .findByLinkText(quickTime).click();
  }

  async getPrettyDuration() {
    return await PageObjects.common.findTestSubject('globalTimepickerRange').getVisibleText();
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

  async ensureTimePickerIsOpen() {
    const isOpen = await PageObjects.header.isTimepickerOpen();
    PageObjects.common.debug(`time picker open: ${isOpen}`);
    if (!isOpen) {
      PageObjects.common.debug('--Opening time picker');
      await PageObjects.header.clickTimepicker();
    }
  }

  async setQuickTime(quickTime) {
    await this.ensureTimePickerIsOpen();
    PageObjects.common.debug('--Clicking Quick button');
    await this.clickQuickButton();
    await this.remote.setFindTimeout(defaultFindTimeout)
      .findByLinkText(quickTime).click();
  }

  async getPrettyDuration() {
    return await PageObjects.common.findTestSubject('globalTimepickerRange').getVisibleText();
  }
}
