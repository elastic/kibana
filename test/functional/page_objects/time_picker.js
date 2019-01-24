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

export function TimePickerPageProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  class TimePickerPage {

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
