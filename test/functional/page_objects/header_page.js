export function HeaderPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const remote = getService('remote');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {

    async clickSelector(selector) {
      log.debug(`clickSelector(${selector})`);
      await retry.try(async () => await remote.findByCssSelector(selector).click());
    }

    async clickDiscover() {
      log.debug('click Discover tab');
      await this.clickSelector('a[href*=\'discover\']');
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickVisualize() {
      log.debug('click Visualize tab');
      await this.clickSelector('a[href*=\'visualize\']');
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickDashboard() {
      log.debug('click Dashboard tab');
      await this.clickSelector('a[href*=\'dashboard\']');
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickManagement() {
      log.debug('click Management tab');
      await this.clickSelector('a[href*=\'management\']');
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickSettings() {
      log.debug('click Settings tab');
      await this.clickSelector('a[href*=\'settings\']');
    }

    async clickTimepicker() {
      await testSubjects.click('globalTimepickerButton');
    }

    async clickQuickButton() {
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        await testSubjects.click('timepicker-quick-button');
      });
    }

    async isTimepickerOpen() {
      return await testSubjects.exists('timePicker');
    }

    async isAbsoluteSectionShowing() {
      log.debug('isAbsoluteSectionShowing');
      return await PageObjects.common.doesCssSelectorExist('input[ng-model=\'absolute.from\']');
    }

    async showAbsoluteSection() {
      log.debug('showAbsoluteSection');
      const isAbsoluteSectionShowing = await this.isAbsoluteSectionShowing();
      if (!isAbsoluteSectionShowing) {
        await retry.try(async () => {
          await remote.setFindTimeout(defaultFindTimeout);
          await testSubjects.click('timepicker-absolute-button');
          // Check to make sure one of the elements on the absolute section is showing.
          await this.getFromTime();
        });
      }
    }

    async getFromTime() {
      log.debug('getFromTime');
      return await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        remote.setFindTimeout(defaultFindTimeout);
        return await remote.findByCssSelector('input[ng-model=\'absolute.from\']')
          .getProperty('value');
      });
    }

    async getToTime() {
      log.debug('getToTime');
      return await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        remote.setFindTimeout(defaultFindTimeout);
        return await remote.findByCssSelector('input[ng-model=\'absolute.to\']')
          .getProperty('value');
      });
    }

    async setFromTime(timeString) {
      log.debug(`setFromTime: ${timeString}`);
      await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        remote.setFindTimeout(defaultFindTimeout);
        await remote.findByCssSelector('input[ng-model=\'absolute.from\']')
          .clearValue()
          .type(timeString);
      });
    }

    async setToTime(timeString) {
      log.debug(`setToTime: ${timeString}`);
      await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        remote.setFindTimeout(defaultFindTimeout);
        await remote.findByCssSelector('input[ng-model=\'absolute.to\']')
          .clearValue()
          .type(timeString);
      });
    }

    async clickGoButton() {
      log.debug('clickGoButton');
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        await testSubjects.click('timepickerGoButton');
        await this.waitUntilLoadingHasFinished();
      });
    }

    async ensureTimePickerIsOpen() {
      log.debug('ensureTimePickerIsOpen');
      const isOpen = await this.isTimepickerOpen();
      if (!isOpen) {
        await retry.try(async () => {
          await this.clickTimepicker();
          const isOpen = await this.isTimepickerOpen();
          if (!isOpen) throw new Error('Time picker still not open, try again.');
        });
      }
    }

    async setAbsoluteRange(fromTime, toTime) {
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await this.ensureTimePickerIsOpen();
      log.debug('--Clicking Absolute button');
      await this.showAbsoluteSection();
      log.debug('--Setting From Time : ' + fromTime);
      await this.setFromTime(fromTime);
      log.debug('--Setting To Time : ' + toTime);
      await this.setToTime(toTime);
      await this.clickGoButton();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async setQuickTime(quickTime) {
      await this.ensureTimePickerIsOpen();
      log.debug('--Clicking Quick button');
      await this.clickQuickButton();
      await remote.setFindTimeout(defaultFindTimeout)
        .findByLinkText(quickTime).click();
    }

    async getAutoRefreshState() {
      return testSubjects.getAttribute('globalTimepickerAutoRefreshButton', 'data-test-subj-state');
    }

    // check if the auto refresh state is active and to pause it
    async pauseAutoRefresh() {
      let result = false;
      if (await this.getAutoRefreshState() === 'active') {
        await testSubjects.click('globalTimepickerAutoRefreshButton');
        result = true;
      }
      return result;
    }

    // check if the auto refresh state is inactive and to resume it
    async resumeAutoRefresh() {
      let result = false;
      if (await this.getAutoRefreshState() === 'inactive') {
        await testSubjects.click('globalTimepickerAutoRefreshButton');
        result = true;
      }
      return result;
    }

    async getToastMessage(findTimeout = defaultFindTimeout) {
      const toastMessage =
        await find.displayedByCssSelector('kbn-truncated.toast-message', findTimeout);
      const messageText = await toastMessage.getVisibleText();
      log.debug(`getToastMessage: ${messageText}`);
      return messageText;
    }

    async waitForToastMessageGone() {
      remote.setFindTimeout(defaultFindTimeout);
      await remote.waitForDeletedByCssSelector('kbn-truncated.toast-message');
    }

    async clickToastOK() {
      log.debug('clickToastOK');
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        await remote.findByCssSelector('button[ng-if="notif.accept"]')
          .click();
      });
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
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async isGlobalLoadingIndicatorVisible() {
      log.debug('isGlobalLoadingIndicatorVisible');
      return await testSubjects.exists('globalLoadingIndicator');
    }

    async awaitGlobalLoadingIndicatorHidden() {
      log.debug('awaitGlobalLoadingIndicatorHidden');
      await testSubjects.find('globalLoadingIndicator-hidden', defaultFindTimeout * 10);
    }

    async getPrettyDuration() {
      return await testSubjects.getVisibleText('globalTimepickerRange');
    }

    async isSharedTimefilterEnabled() {
      return await find.existsByCssSelector('[shared-timefilter=true]');
    }
  }

  return new HeaderPage();
}
