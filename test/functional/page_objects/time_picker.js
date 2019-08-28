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
  const PageObjects = getPageObjects(['header']);

  class TimePickerPage {

    async timePickerExists() {
      return await testSubjects.exists('superDatePickerToggleQuickMenuButton');
    }

    formatDateToAbsoluteTimeString(date) {
      // toISOString returns dates in format 'YYYY-MM-DDTHH:mm:ss.sssZ'
      // Need to replace T with space and remove timezone
      const dateString = date.toISOString().replace('T', ' ');
      return dateString.substring(0, 23);
    }

    async getTimePickerPanel() {
      return await find.byCssSelector('div.euiPopover__panel-isOpen');
    }

    async waitPanelIsGone(panelElement) {
      await find.waitForElementStale(panelElement);
    }

    async setAbsoluteStart(startTime) {
      await this.showStartEndTimes();

      await testSubjects.click('superDatePickerstartDatePopoverButton');
      const panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await this.inputValue('superDatePickerAbsoluteDateInput', startTime);
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await this.waitPanelIsGone(panel);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
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
      } else {
        await testSubjects.setValue(dataTestsubj, value);
      }
    }

    /**
     * @param {String} fromTime YYYY-MM-DD HH:mm:ss.SSS
     * @param {String} fromTime YYYY-MM-DD HH:mm:ss.SSS
     */
    async setAbsoluteRange(fromTime, toTime) {
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await this.showStartEndTimes();

      // set to time
      await testSubjects.click('superDatePickerendDatePopoverButton');
      let panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await this.inputValue('superDatePickerAbsoluteDateInput', toTime);


      // set from time
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await this.waitPanelIsGone(panel);
      panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await this.inputValue('superDatePickerAbsoluteDateInput', fromTime);

      const superDatePickerApplyButtonExists = await testSubjects.exists('superDatePickerApplyTimeButton');
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
    }

    async getRefreshConfig(keepQuickSelectOpen = false) {
      await this.openQuickSelectTimeMenu();
      const interval = await testSubjects.getAttribute('superDatePickerRefreshIntervalInput', 'value');

      let selectedUnit;
      const select = await testSubjects.find('superDatePickerRefreshIntervalUnitsSelect');
      const options = await find.allDescendantDisplayedByCssSelector('option', select);
      await Promise.all(options.map(async (optionElement) => {
        const isSelected = await optionElement.isSelected();
        if (isSelected) {
          selectedUnit = await optionElement.getVisibleText();
        }
      }));

      const toggleButtonText = await testSubjects.getVisibleText('superDatePickerToggleRefreshButton');
      if (!keepQuickSelectOpen) {
        await this.closeQuickSelectTimeMenu();
      }

      return {
        interval,
        units: selectedUnit,
        isPaused: toggleButtonText === 'Start' ? true : false
      };
    }

    async getTimeConfig() {
      await this.showStartEndTimes();
      const start = await testSubjects.getVisibleText('superDatePickerstartDatePopoverButton');
      const end = await testSubjects.getVisibleText('superDatePickerendDatePopoverButton');
      return {
        start,
        end
      };
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
        end
      };
    }

    async getTimeDurationInHours() {
      const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';
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
