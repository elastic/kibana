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
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const find = getService('find');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    async clickTimepicker() {
      await retry.try(async () => {
        await find.clickByCssSelector('superDatePickerToggleQuickMenuButton');
      });
    }

    async isTimepickerOpen() {
      const el = await find.byCssSelector('QuickSelectPopover');
      const elClass = await el.getAttribute('class');
      return elClass.toString().includes('euiPopover-isOpen');
    }

    async clickTimespan(timespan) {
      await find.clickByCssSelector('superDatePickerCommonlyUsed_' + timespan.split(' ').join('_'));
    }

    async getSpinnerDone() {
      const tenXLonger = config.get('timeouts.waitFor') * 5;
      return find.byCssSelector('[data-test-subj="globalLoadingIndicator-hidden"]', tenXLonger);
    }

    async clickReporting() {
      await testSubjects.click('shareTopNavButton');
    }

    async clickPrintablePdf() {
      await testSubjects.click('sharePanel-PDFReports');
    }

    async setQuickSpan(timespan) {
      await PageObjects.common.sleep(2000);
      const isOpen = await this.isTimepickerOpen();
      if (!isOpen) {
        log.debug(`### We didn't find the timepicker open so clickTimepicker`);
        await this.clickTimepicker();
        await PageObjects.common.sleep(1000);
        log.debug('### --Select time span : ' + timespan);
        await this.clickTimespan(timespan);
        await this.getSpinnerDone();
      }
    }

    async setFromRelativeTime(count, unit) {
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await PageObjects.common.sleep(50);
      await testSubjects.click('superDatePickerRelativeTab');
      await PageObjects.common.sleep(51);
      await testSubjects.click('superDatePickerRelativeDateInputNumber');
      await PageObjects.common.sleep(51);
      await (await testSubjects.find('superDatePickerRelativeDateInputNumber')).clearValue();
      await (await testSubjects.find('superDatePickerRelativeDateInputNumber')).type(count);
      await PageObjects.common.sleep(52);
      await testSubjects.click('superDatePickerRelativeDateInputUnitSelector');
      await PageObjects.common.sleep(53);
      await find.clickByCssSelector(
        `select[data-test-subj="superDatePickerRelativeDateInputUnitSelector"] option[value="${unit}"]`
      );
      await testSubjects.click('superDatePickerstartDatePopoverButton');
    }

    async getToastMessage() {
      const twoXLonger = config.get('timeouts.waitFor') * 2;
      await find.displayedByCssSelector('kbn-truncated.toast-message', twoXLonger).getVisibleText();
    }

    async waitForToastMessageGone() {
      await find.waitForDeletedByCssSelector('kbn-truncated.toast-message');
    }

    async setFromTime(timeString) {
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await testSubjects.click('superDatePickerAbsoluteTab');
      await PageObjects.common.sleep(200);
      await testSubjects.click('superDatePickerAbsoluteDateInput');
      await (await testSubjects.find('superDatePickerAbsoluteDateInput')).clearValue();
      await (await testSubjects.find('superDatePickerAbsoluteDateInput')).type(timeString);
    }

    async clickToastOK() {
      await find.clickByCssSelector('div.toaster-container button:nth-child(1)');
    }

    async setAbsoluteRange(fromTime, toTime) {
      await PageObjects.common.sleep(2000);
      await testSubjects.click('superDatePickerShowDatesButton');
      log.debug('--Setting From Time : ' + fromTime);
      await this.setFromTime(fromTime);
      log.debug('--Setting To Time : ' + toTime);
      await this.setToTime(toTime);
      await this.clickGoButton();
      await this.getSpinnerDone();
    }

    async setToRelativeTime(count, unit) {
      await PageObjects.common.sleep(53);
      await testSubjects.click('superDatePickerendDatePopoverButton');
      await PageObjects.common.sleep(54);
      await testSubjects.click('superDatePickerRelativeTab');
      await PageObjects.common.sleep(55);
      await testSubjects.click('superDatePickerRelativeDateInputNumber');
      await PageObjects.common.sleep(51);
      await (await testSubjects.find('superDatePickerRelativeDateInputNumber')).clearValue();
      await (await testSubjects.find('superDatePickerRelativeDateInputNumber')).type(count);
      await PageObjects.common.sleep(56);
      await testSubjects.click('superDatePickerRelativeDateInputUnitSelector');
      await PageObjects.common.sleep(57);
      await find.clickByCssSelector(
        `select[data-test-subj="superDatePickerRelativeDateInputUnitSelector"] option[value="${unit}"]`
      );
      await testSubjects.click('superDatePickerendDatePopoverButton');
    }

    async setRelativeRange(fromCount, fromUnit, toCount, toUnit) {
      await PageObjects.common.sleep(2000);
      await testSubjects.click('superDatePickerShowDatesButton');
      await PageObjects.common.sleep(2000);
      log.debug(`### --Setting From Time : ${fromCount} ${fromUnit}`);
      await this.setFromRelativeTime(fromCount, fromUnit);
      await PageObjects.common.sleep(200);
      await testSubjects.click('superDatePickerShowDatesButton');
      await PageObjects.common.sleep(200);
      log.debug(`### --Setting To Time : ${toCount} ${toUnit}`);
      await this.setToRelativeTime(toCount, toUnit);
      await testSubjects.click('querySubmitButton');
      return await this.getSpinnerDone();
    }

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
      return await testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
    }

    async awaitGlobalLoadingIndicatorHidden() {
      await testSubjects.existOrFail('globalLoadingIndicator-hidden', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    }

    async awaitKibanaChrome() {
      log.debug('awaitKibanaChrome');
      await testSubjects.find('kibanaChrome', defaultFindTimeout * 10);
    }
  }

  return new HeaderPage();
}
