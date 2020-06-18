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
import { FtrProviderContext } from '../ftr_provider_context.d';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export type CommonlyUsed =
  | 'Today'
  | 'This_week'
  | 'Last_15 minutes'
  | 'Last_30 minutes'
  | 'Last_1 hour'
  | 'Last_24 hours'
  | 'Last_7 days'
  | 'Last_30 days'
  | 'Last_90 days'
  | 'Last_1 year';

export function TimePickerProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const { header, common } = getPageObjects(['header', 'common']);
  const kibanaServer = getService('kibanaServer');

  class TimePicker {
    defaultStartTime = 'Sep 19, 2015 @ 06:31:44.000';
    defaultEndTime = 'Sep 23, 2015 @ 18:31:44.000';
    defaultStartTimeUTC = '2015-09-18T06:31:44.000Z';
    defaultEndTimeUTC = '2015-09-23T18:31:44.000Z';

    async setDefaultAbsoluteRange() {
      await this.setAbsoluteRange(this.defaultStartTime, this.defaultEndTime);
    }

    async ensureHiddenNoDataPopover() {
      const isVisible = await testSubjects.exists('noDataPopoverDismissButton');
      if (isVisible) {
        await testSubjects.click('noDataPopoverDismissButton');
      }
    }

    /**
     * the provides a quicker way to set the timepicker to the default range, saves a few seconds
     */
    async setDefaultAbsoluteRangeViaUiSettings() {
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${this.defaultStartTimeUTC}", "to": "${this.defaultEndTimeUTC}"}`,
      });
    }

    async resetDefaultAbsoluteRangeViaUiSettings() {
      await kibanaServer.uiSettings.replace({});
    }

    private async getTimePickerPanel() {
      return await find.byCssSelector('div.euiPopover__panel-isOpen');
    }

    private async waitPanelIsGone(panelElement: WebElementWrapper) {
      await find.waitForElementStale(panelElement);
    }

    public async timePickerExists() {
      return await testSubjects.exists('superDatePickerToggleQuickMenuButton');
    }

    /**
     * Sets commonly used time
     * @param option 'Today' | 'This_week' | 'Last_15 minutes' | 'Last_24 hours' ...
     */
    async setCommonlyUsedTime(option: CommonlyUsed | string) {
      await testSubjects.click('superDatePickerToggleQuickMenuButton');
      await testSubjects.click(`superDatePickerCommonlyUsed_${option}`);
    }

    private async inputValue(dataTestSubj: string, value: string) {
      if (browser.isFirefox) {
        const input = await testSubjects.find(dataTestSubj);
        await input.clearValue();
        await input.type(value);
      } else if (browser.isInternetExplorer) {
        const input = await testSubjects.find(dataTestSubj);
        const currentValue = await input.getAttribute('value');
        await input.type(browser.keys.ARROW_RIGHT.repeat(currentValue.length));
        await input.type(browser.keys.BACK_SPACE.repeat(currentValue.length));
        await input.type(value);
        await input.click();
      } else {
        await testSubjects.setValue(dataTestSubj, value);
      }
    }

    private async showStartEndTimes() {
      // This first await makes sure the superDatePicker has loaded before we check for the ShowDatesButton
      await testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 20000 });
      const isShowDatesButton = await testSubjects.exists('superDatePickerShowDatesButton');
      if (isShowDatesButton) {
        await testSubjects.click('superDatePickerShowDatesButton');
      }
      await testSubjects.exists('superDatePickerstartDatePopoverButton');
    }

    /**
     * @param {String} fromTime MMM D, YYYY @ HH:mm:ss.SSS
     * @param {String} toTime MMM D, YYYY @ HH:mm:ss.SSS
     */
    public async setAbsoluteRange(fromTime: string, toTime: string) {
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await this.showStartEndTimes();

      // set to time
      await testSubjects.click('superDatePickerendDatePopoverButton');
      let panel = await this.getTimePickerPanel();
      await testSubjects.click('superDatePickerAbsoluteTab');
      await testSubjects.click('superDatePickerAbsoluteDateInput');
      await this.inputValue('superDatePickerAbsoluteDateInput', toTime);
      await common.sleep(500);

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
      await header.awaitGlobalLoadingIndicatorHidden();
    }

    public async isOff() {
      return await find.existsByCssSelector('.euiDatePickerRange--readOnly');
    }

    public async isQuickSelectMenuOpen() {
      return await testSubjects.exists('superDatePickerQuickMenu');
    }

    public async openQuickSelectTimeMenu() {
      log.debug('openQuickSelectTimeMenu');
      const isMenuOpen = await this.isQuickSelectMenuOpen();
      if (!isMenuOpen) {
        log.debug('opening quick select menu');
        await retry.try(async () => {
          await testSubjects.click('superDatePickerToggleQuickMenuButton');
        });
      }
    }

    public async closeQuickSelectTimeMenu() {
      log.debug('closeQuickSelectTimeMenu');
      const isMenuOpen = await this.isQuickSelectMenuOpen();
      if (isMenuOpen) {
        log.debug('closing quick select menu');
        await retry.try(async () => {
          await testSubjects.click('superDatePickerToggleQuickMenuButton');
        });
      }
    }

    public async getRefreshConfig(keepQuickSelectOpen = false) {
      await this.openQuickSelectTimeMenu();
      const interval = await testSubjects.getAttribute(
        'superDatePickerRefreshIntervalInput',
        'value'
      );

      let selectedUnit;
      const select = await testSubjects.find('superDatePickerRefreshIntervalUnitsSelect');
      const options = await find.allDescendantDisplayedByCssSelector('option', select);
      await Promise.all(
        options.map(async (optionElement) => {
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

    public async getTimeConfig() {
      await this.showStartEndTimes();
      const start = await testSubjects.getVisibleText('superDatePickerstartDatePopoverButton');
      const end = await testSubjects.getVisibleText('superDatePickerendDatePopoverButton');
      return {
        start,
        end,
      };
    }

    public async getShowDatesButtonText() {
      const button = await testSubjects.find('superDatePickerShowDatesButton');
      const text = await button.getVisibleText();
      return text;
    }

    public async getTimeDurationForSharing() {
      return await testSubjects.getAttribute(
        'dataSharedTimefilterDuration',
        'data-shared-timefilter-duration'
      );
    }

    public async getTimeConfigAsAbsoluteTimes() {
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

    public async getTimeDurationInHours() {
      const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
      const { start, end } = await this.getTimeConfigAsAbsoluteTimes();
      const startMoment = moment(start, DEFAULT_DATE_FORMAT);
      const endMoment = moment(end, DEFAULT_DATE_FORMAT);
      return moment.duration(endMoment.diff(startMoment)).asHours();
    }

    public async pauseAutoRefresh() {
      log.debug('pauseAutoRefresh');
      const refreshConfig = await this.getRefreshConfig(true);
      if (!refreshConfig.isPaused) {
        log.debug('pause auto refresh');
        await testSubjects.click('superDatePickerToggleRefreshButton');
        await this.closeQuickSelectTimeMenu();
      }

      await this.closeQuickSelectTimeMenu();
    }

    public async resumeAutoRefresh() {
      log.debug('resumeAutoRefresh');
      const refreshConfig = await this.getRefreshConfig(true);
      if (refreshConfig.isPaused) {
        log.debug('resume auto refresh');
        await testSubjects.click('superDatePickerToggleRefreshButton');
      }

      await this.closeQuickSelectTimeMenu();
    }

    public async setHistoricalDataRange() {
      await this.setDefaultAbsoluteRange();
    }

    public async setDefaultDataRange() {
      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'Apr 13, 2018 @ 00:00:00.000';
      await this.setAbsoluteRange(fromTime, toTime);
    }

    public async setLogstashDataRange() {
      const fromTime = 'Apr 9, 2018 @ 00:00:00.000';
      const toTime = 'Apr 13, 2018 @ 00:00:00.000';
      await this.setAbsoluteRange(fromTime, toTime);
    }
  }

  return new TimePicker();
}
