export function HeaderPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const remote = getService('remote');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    clickSelector(selector) {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector(selector)
        .then(tab => {
          return tab.click();
        });
    }

    clickDiscover() {
      log.debug('click Discover tab');
      this.clickSelector('a[href*=\'discover\']');
      return PageObjects.common.sleep(3000);
    }

    clickVisualize() {
      log.debug('click Visualize tab');
      this.clickSelector('a[href*=\'visualize\']');
      return PageObjects.common.sleep(3000);
    }

    clickDashboard() {
      log.debug('click Dashboard tab');
      this.clickSelector('a[href*=\'dashboard\']');
      return PageObjects.common.sleep(3000);
    }

    clickSettings() {
      log.debug('click Settings tab');
      this.clickSelector('a[href*=\'settings\']');
    }

    clickTimepicker() {
      return testSubjects.click('globalTimepickerButton');
    }

    clickQuickButton() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText('Quick').click();
    }

    isTimepickerOpen() {
      return remote.setFindTimeout(2000)
      .findDisplayedByCssSelector('.kbn-timepicker')
      .then(() => true)
      .catch(() => false);
    }

    async clickAbsoluteButton() {
      await retry.try(async () => {
        await remote.setFindTimeout(defaultFindTimeout);
        const absoluteButton = await remote.findByLinkText('Absolute');
        await absoluteButton.click();
      });
    }

    clickQuickButton() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText('Quick').click();
    }

    async getFromTime() {
      await this.ensureTimePickerIsOpen();
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model=\'absolute.from\']')
        .getProperty('value');
    }

    async getToTime() {
      await this.ensureTimePickerIsOpen();
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model=\'absolute.to\']')
        .getProperty('value');
    }

    async getFromTime() {
      await this.ensureTimePickerIsOpen();
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model=\'absolute.from\']')
        .getProperty('value');
    }

    async getToTime() {
      await this.ensureTimePickerIsOpen();
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model=\'absolute.to\']')
        .getProperty('value');
    }

    setFromTime(timeString) {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .clearValue()
      .type(timeString);
    }

    setToTime(timeString) {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .clearValue()
      .type(timeString);
    }

    clickGoButton() {
      const self = this;
      return remote.setFindTimeout(defaultFindTimeout)
      .findByClassName('kbn-timepicker-go')
      .click()
      .then(function () {
        return self.waitUntilLoadingHasFinished();
      });
    }

    setAbsoluteRange(fromTime, toTime) {
      log.debug('clickTimepicker');
      return this.clickTimepicker()
        .then(() => {
          log.debug('--Clicking Absolute button');
          return this.clickAbsoluteButton();
        })
        .then(() => {
          log.debug('--Setting From Time : ' + fromTime);
          return this.setFromTime(fromTime);
        })
        .then(() => {
          log.debug('--Setting To Time : ' + toTime);
          return this.setToTime(toTime);
        })
        .then(() => {
          return this.clickGoButton();
        })
        .then(() => {
          return this.waitUntilLoadingHasFinished();
        });
    }

    async ensureTimePickerIsOpen() {
      const isOpen = await this.isTimepickerOpen();
      log.debug(`time picker open: ${isOpen}`);
      if (!isOpen) {
        log.debug('--Opening time picker');
        await this.clickTimepicker();
      }
    }

    async setAbsoluteRange(fromTime, toTime) {
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await this.ensureTimePickerIsOpen();
      log.debug('--Clicking Absolute button');
      await this.clickAbsoluteButton();
      log.debug('--Setting From Time : ' + fromTime);
      await this.setFromTime(fromTime);
      log.debug('--Setting To Time : ' + toTime);
      await this.setToTime(toTime);
      await this.clickGoButton();
      await this.isGlobalLoadingIndicatorHidden();
    }

    async setQuickTime(quickTime) {
      await this.ensureTimePickerIsOpen();
      log.debug('--Clicking Quick button');
      await this.clickQuickButton();
      await remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText(quickTime).click();
    }

    async getPrettyDuration() {
      return await PageObjects.common.findTestSubject('globalTimepickerRange').getVisibleText();
    }

    getToastMessage() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .getVisibleText();
    }

    waitForToastMessageGone() {
      return remote.setFindTimeout(defaultFindTimeout)
        .waitForDeletedByCssSelector('kbn-truncated.toast-message');
    }

    clickToastOK() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[ng-if="notif.accept"]')
      .click();
    }

    async waitUntilLoadingHasFinished() {
      try {
        await this.isGlobalLoadingIndicatorVisible();
      } catch (exception) {
        if (exception.name === 'ElementNotVisible') {
          // selenium might just have been too slow to catch it
        } else {
          throw exception;
        }
      }
      await this.isGlobalLoadingIndicatorHidden();
    }

    isGlobalLoadingIndicatorVisible() {
      return testSubjects.find('globalLoadingIndicator', defaultFindTimeout / 5);
    }

    isGlobalLoadingIndicatorHidden() {
      return remote.setFindTimeout(defaultFindTimeout * 10)
      .findByCssSelector('[data-test-subj="globalLoadingIndicator"].ng-hide');
    }

    async ensureTimePickerIsOpen() {
      const isOpen = await this.isTimepickerOpen();
      log.debug(`time picker open: ${isOpen}`);
      if (!isOpen) {
        log.debug('--Opening time picker');
        await this.clickTimepicker();
      }
    }

    async setQuickTime(quickTime) {
      await this.ensureTimePickerIsOpen();
      log.debug('--Clicking Quick button');
      await this.clickQuickButton();
      await remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText(quickTime).click();
    }

    async getPrettyDuration() {
      return await testSubjects.find('globalTimepickerRange').getVisibleText();
    }

    async isSharedTimefilterEnabled() {
      const element = await remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`[shared-timefilter=true]`);

      return new Boolean(element);
    }
  }

  return new HeaderPage();
}
