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

import moment from 'moment';

export function TimePickerPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);

  class TimePickerPage {
    async timePickerExists() {
      return await testSubjects.exists('superDatePickerToggleQuickMenuButton');
    }

    formatDateToAbsoluteTimeString(date) {
      // toISOString returns dates in format 'YYYY-MM-DDTHH:mm:ss.sssZ'
      // Need to replace T with space and remove timezone
      const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
      return moment(date).format(DEFAULT_DATE_FORMAT);
    }

    async getTimePickerPanel() {
      return await find.byCssSelector('div.euiPopover__panel-isOpen');
    }

    async waitPanelIsGone(panelElement) {
      await find.waitForElementStale(panelElement);
    }

    /**
     * @param {String} commonlyUsedOption 'superDatePickerCommonlyUsed_This_week'
     */
    async setCommonlyUsedTime(commonlyUsedOption) {
      await testSubjects.click('superDatePickerToggleQuickMenuButton');
      await testSubjects.click(commonlyUsedOption);
    }

    async inputValue(dataTestsubj, value) {
      if (browser.isFirefox) {
        const input = await testSubjects.find(dataTestsubj);
        await input.clearValue();
        await input.type(value);
      } else if (browser.isInternetExplorer) {
        const input = await testSubjects.find(dataTestsubj);
        const currentValue = await input.getAttribute('value');
        await input.type(browser.keys.ARROW_RIGHT.repeat(currentValue.length));
        await input.type(browser.keys.BACK_SPACE.repeat(currentValue.length));
        await input.type(value);
        await input.click();
      } else {
        await testSubjects.setValue(dataTestsubj, value);
      }
    }

    /**
     * @param {String} fromTime MMM D, YYYY @ HH:mm:ss.SSS
     * @param {String} toTime MMM D, YYYY @ HH:mm:ss.SSS
     */
    async setAbsoluteRange(fromTime, toTime) {
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await this.showStartEndTimes();

      // set to time
      await testSubjects.click('superDatePickerendDatePopoverButton');
      let panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await testSubjects.click('superDatePickerAbsoluteDateInput');
      await this.inputValue('superDatePickerAbsoluteDateInput', toTime);
      await PageObjects.common.sleep(500);

      // set from time
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await this.waitPanelIsGone(panel);
      panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await testSubjects.click('superDatePickerAbsoluteDateInput');
      await this.inputValue('superDatePickerAbsoluteDateInput', fromTime);

      const superDatePickerApplyButtonExists = await testSubjects.exists(
        'superDatePickerApplyTimeButton'
      );
      if (superDatePickerApplyButtonExists) {
        // Timepicker is in top nav
        // Click super date picker apply button to apply time range
        await testSubjects.click('superDatePickerApplyTimeButton');
      } else {
        // Timepicker is embedded in query bar
        // click query bar submit button to apply time range
        await testSubjects.click('querySubmitButton');
      }

      await this.waitPanelIsGone(panel);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    get defaultStartTime() {
      return 'Sep 19, 2015 @ 06:31:44.000';
    }
    get defaultEndTime() {
      return 'Sep 23, 2015 @ 18:31:44.000';
    }

    async setDefaultAbsoluteRange() {
      await this.setAbsoluteRange(this.defaultStartTime, this.defaultEndTime);
    }

    async isQuickSelectMenuOpen() {
      return await testSubjects.exists('superDatePickerQuickMenu');
    }

    async openQuickSelectTimeMenu() {
      log.debug('openQuickSelectTimeMenu');
      const isMenuOpen = await this.isQuickSelectMenuOpen();
      if (!isMenuOpen) {
        log.debug('opening quick select menu');
        await retry.try(async () => {
          await testSubjects.click('superDatePickerToggleQuickMenuButton');
        });
      }
    }

    async closeQuickSelectTimeMenu() {
      log.debug('closeQuickSelectTimeMenu');
      const isMenuOpen = await this.isQuickSelectMenuOpen();
      if (isMenuOpen) {
        log.debug('closing quick select menu');
        await retry.try(async () => {
          await testSubjects.click('superDatePickerToggleQuickMenuButton');
        });
      }
    }

    async showStartEndTimes() {
      // This first await makes sure the superDatePicker has loaded before we check for the ShowDatesButton
      await testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 20000 });
      const isShowDatesButton = await testSubjects.exists('superDatePickerShowDatesButton');
      if (isShowDatesButton) {
        await testSubjects.click('superDatePickerShowDatesButton');
      }
      await testSubjects.exists('superDatePickerstartDatePopoverButton');
    }

    async getRefreshConfig(keepQuickSelectOpen = false) {
      await this.openQuickSelectTimeMenu();
      const interval = await testSubjects.getAttribute(
        'superDatePickerRefreshIntervalInput',
        'value'
      );

      let selectedUnit;
      const select = await testSubjects.find('superDatePickerRefreshIntervalUnitsSelect');
      const options = await find.allDescendantDisplayedByCssSelector('option', select);
      await Promise.all(
        options.map(async optionElement => {
          const isSelected = await optionElement.isSelected();
          if (isSelected) {
            selectedUnit = await optionElement.getVisibleText();
          }
        })
      );

      const toggleButtonText = await testSubjects.getVisibleText(
        'superDatePickerToggleRefreshButton'
      );
      if (!keepQuickSelectOpen) {
        await this.closeQuickSelectTimeMenu();
      }

      return {
        interval,
        units: selectedUnit,
        isPaused: toggleButtonText === 'Start' ? true : false,
      };
    }

    async getTimeConfig() {
      await this.showStartEndTimes();
      const start = await testSubjects.getVisibleText('superDatePickerstartDatePopoverButton');
      const end = await testSubjects.getVisibleText('superDatePickerendDatePopoverButton');
      return {
        start,
        end,
      };
    }

    async getTimeDurationForSharing() {
      return await retry.try(async () => {
        const element = await testSubjects.find('dataSharedTimefilterDuration');
        const data = await element.getAttribute('data-shared-timefilter-duration');
        return data;
      });
    }

    async getTimeConfigAsAbsoluteTimes() {
      await this.showStartEndTimes();

      // get to time
      await testSubjects.click('superDatePickerendDatePopoverButton');
      const panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      const end = await testSubjects.getAttribute('superDatePickerAbsoluteDateInput', 'value');

      // get from time
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await this.waitPanelIsGone(panel);
      await testSubjects.click('superDatePickerAbsoluteTab');
      const start = await testSubjects.getAttribute('superDatePickerAbsoluteDateInput', 'value');

      return {
        start,
        end,
      };
    }

    async getTimeDurationInHours() {
      const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
      const { start, end } = await this.getTimeConfigAsAbsoluteTimes();

      const startMoment = moment(start, DEFAULT_DATE_FORMAT);
      const endMoment = moment(end, DEFAULT_DATE_FORMAT);

      return moment.duration(moment(endMoment) - moment(startMoment)).asHours();
    }

    async pauseAutoRefresh() {
      log.debug('pauseAutoRefresh');
      const refreshConfig = await this.getRefreshConfig(true);
      if (!refreshConfig.isPaused) {
        log.debug('pause auto refresh');
        await testSubjects.click('superDatePickerToggleRefreshButton');
        await this.closeQuickSelectTimeMenu();
      }

      await this.closeQuickSelectTimeMenu();
    }

    async resumeAutoRefresh() {
      log.debug('resumeAutoRefresh');
      const refreshConfig = await this.getRefreshConfig(true);
      if (refreshConfig.isPaused) {
        log.debug('resume auto refresh');
        await testSubjects.click('superDatePickerToggleRefreshButton');
      }

      await this.closeQuickSelectTimeMenu();
    }
  }

  return new TimePickerPage();
}
