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

export function HeaderPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    async clickDiscover() {
      await appsMenu.clickLink('Discover');
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickVisualize() {
      await appsMenu.clickLink('Visualize');
      await this.awaitGlobalLoadingIndicatorHidden();
      await retry.waitFor('first breadcrumb to be "Visualize"', async () => {
        const firstBreadcrumb = await globalNav.getFirstBreadcrumb();
        if (firstBreadcrumb !== 'Visualize') {
          log.debug('-- first breadcrumb =', firstBreadcrumb);
          return false;
        }

        return true;
      });
    }

    async clickDashboard() {
      await appsMenu.clickLink('Dashboard');
      await retry.waitFor('dashboard app to be loaded', async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        const isLandingPageVisible = await testSubjects.exists('dashboardLandingPage');
        return isNavVisible || isLandingPageVisible;
      });
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickManagement() {
      await appsMenu.clickLink('Management');
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickTimepicker() {
      await testSubjects.click('globalTimepickerButton');
    }

    async clickQuickButton() {
      await retry.try(async () => {
        await testSubjects.click('timepicker-quick-button');
      });
    }

    async isTimepickerOpen() {
      return await testSubjects.exists('timePicker');
    }

    async isAbsoluteSectionShowing() {
      log.debug('isAbsoluteSectionShowing');
      return await find.existsByCssSelector('input[ng-model=\'absolute.from\']');
    }

    async showAbsoluteSection() {
      log.debug('showAbsoluteSection');
      const isAbsoluteSectionShowing = await this.isAbsoluteSectionShowing();
      if (!isAbsoluteSectionShowing) {
        await retry.try(async () => {
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
        const element = await find.byCssSelector('input[ng-model=\'absolute.from\']');
        return await element.getProperty('value');
      });
    }

    async getToTime() {
      log.debug('getToTime');
      return await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        const element = await find.byCssSelector('input[ng-model=\'absolute.to\']');
        return await element.getProperty('value');
      });
    }

    async setFromTime(timeString) {
      log.debug(`setFromTime: ${timeString}`);
      await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        await find.setValue('input[ng-model=\'absolute.from\']', timeString);
      });
    }

    async setToTime(timeString) {
      log.debug(`setToTime: ${timeString}`);
      await retry.try(async () => {
        await this.ensureTimePickerIsOpen();
        await this.showAbsoluteSection();
        await find.setValue('input[ng-model=\'absolute.to\']', timeString);
      });
    }

    async clickGoButton() {
      log.debug('clickGoButton');
      await retry.try(async () => {
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
      await find.clickByLinkText(quickTime);
    }

    async getAutoRefreshState() {
      return testSubjects.getAttribute('globalTimepickerAutoRefreshButton', 'data-test-subj-state');
    }

    async getRefreshConfig() {
      const refreshState = await testSubjects.getAttribute('globalTimepickerAutoRefreshButton', 'data-test-subj-state');
      const refreshConfig = await testSubjects.getVisibleText('globalRefreshButton');
      return `${refreshState} ${refreshConfig}`;
    }

    // check if the auto refresh state is active and to pause it
    async pauseAutoRefresh() {
      let result = false;
      if ((await this.getAutoRefreshState()) === 'active') {
        await testSubjects.click('globalTimepickerAutoRefreshButton');
        result = true;
      }
      return result;
    }

    // check if the auto refresh state is inactive and to resume it
    async resumeAutoRefresh() {
      let result = false;
      if ((await this.getAutoRefreshState()) === 'inactive') {
        await testSubjects.click('globalTimepickerAutoRefreshButton');
        result = true;
      }
      return result;
    }

    async getToastMessage(findTimeout = defaultFindTimeout) {
      const toastMessage = await find.displayedByCssSelector(
        'kbn-truncated.kbnToast__message',
        findTimeout
      );
      const messageText = await toastMessage.getVisibleText();
      log.debug(`getToastMessage: ${messageText}`);
      return messageText;
    }

    async clickToastOK() {
      log.debug('clickToastOK');
      await find.clickByCssSelector('button[ng-if="notif.accept"]');
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
      await testSubjects.existOrFail('globalLoadingIndicator-hidden', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10
      });
    }

    async awaitKibanaChrome() {
      log.debug('awaitKibanaChrome');
      await testSubjects.find('kibanaChrome', defaultFindTimeout * 10);
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
