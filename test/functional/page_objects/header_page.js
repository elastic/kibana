/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//import { is } from 'bluebird';
import { By } from 'selenium-webdriver';


export function HeaderPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const remote = getService('remote');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const wait = getService('wait');
  const PageObjects = getPageObjects(['common']);

  const quickButtonSelector = By.css('[data-test-subj="timepicker-quick-button"');
  const absoluteFromInputSelector = By.css('[data-test-subj="absolute-datetime-input-from"]');

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {

    async clickSelector(selector) {
      log.debug(`clickSelector(${selector})`);
      await find.clickByCssSelector(selector);
    }

    async confirmTopNavTextContains(text) {
      await retry.try(async () => {
        const topNavText = await PageObjects.common.getTopNavText();
        if (topNavText.toLowerCase().indexOf(text.toLowerCase()) < 0) {
          throw new Error(`Top nav text ${topNavText} does not contain ${text} (case insensitive)`);
        }
      });
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
      await this.confirmTopNavTextContains('visualize');
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickDashboard() {
      log.debug('click Dashboard tab');
      await this.clickSelector('a[href*=\'dashboard\']');
      await retry.try(async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        const isLandingPageVisible = await testSubjects.exists('dashboardLandingPage');
        if (!isNavVisible && !isLandingPageVisible) {
          throw new Error('Dashboard application not loaded yet');
        }
      });
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
      const timePicker = await testSubjects.find('globalTimepickerButton');
      timePicker.click();
      await wait.forElementPresent(quickButtonSelector);
      const quickButton = await remote.findElement(quickButtonSelector);
      await wait.forElementVisible(quickButton);
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


    async showAbsoluteSection() {
      log.debug('showAbsoluteSection');
      await testSubjects.click('timepicker-absolute-button');
      await wait.forElementPresent(absoluteFromInputSelector);
      const absoluteFromInput = await remote.findElement(absoluteFromInputSelector);
      await wait.forElementVisible(absoluteFromInput);
    }

    async getFromTime() {
      log.debug('getFromTime');
      return await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        const absoluteFrom = await testSubjects.find('absolute-datetime-input-from');
        return await absoluteFrom.getAttribute('value');
      });
    }

    async getToTime() {
      log.debug('getToTime');
      return await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        const absoluteTo = await testSubjects.find('absolute-datetime-input-to');
        return await absoluteTo.getAttribute('value');
      });
    }

    async setFromTime(timeString) {
      log.debug(`setFromTime: ${timeString}`);
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        log.debug('typing into the thang: ' + timeString);
        await testSubjects.setValue('absolute-datetime-input-from', timeString);
      });
    }

    async setToTime(timeString) {
      log.debug(`setToTime: ${timeString}`);
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        await testSubjects.setValue('absolute-datetime-input-to', timeString);
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
      await this.clickTimepicker();
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
      const toastMessage = await remote.findElement(By.css('kbn-truncated.toast-message'), findTimeout);
      const messageText = await toastMessage.getText();
      log.debug(`getToastMessage: ${messageText}`);
      return messageText;
    }

    async clickToastOK() {
      log.debug('clickToastOK');
      await retry.try(async () => {
        remote.setFindTimeout(defaultFindTimeout);
        const toastOK =  await remote.findElement(By.css('button[ng-if="notif.accept"]'));
        await toastOK.click();
      });
    }

    async waitUntilLoadingHasFinished() {
      try {
        await this.isGlobalLoadingIndicatorVisible();
      } catch (exception) {
        if (exception.name === 'ElementNotVisible') {
          // selenium might just have been too slow to catch it
        } else {
          log.debug(exception.name);
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
      wait.forCondition(async () => {
        return await testSubjects.find('globalLoadingIndicator-hidden', defaultFindTimeout * 10) !== null;
      });
    }

    async getGlobalNavigationLink(linkText) {
      const nav = await testSubjects.find('globalNav');
      return await nav.findByPartialLinkText(linkText);
    }

    async clickGlobalNavigationLink(appTitle) {
      const link = await this.getGlobalNavigationLink(appTitle);
      await link.click();
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
