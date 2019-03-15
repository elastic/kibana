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

export function ComboBoxProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  // wrapper around EuiComboBox interactions
  class ComboBox {

    async set(comboBoxSelector, value) {
      log.debug(`comboBox.set, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this.setElement(comboBox, value);
    }

    async setElement(comboBoxElement, value) {
      log.debug(`comboBox.setElement, value: ${value}`);
      await this._filterOptionsList(comboBoxElement, value);
      await this.openOptionsList(comboBoxElement);
      await find.clickByCssSelector('.euiComboBoxOption');
      await this.closeOptionsList(comboBoxElement);
    }

    async filterOptionsList(comboBoxSelector, filterValue) {
      log.debug(`comboBox.filterOptionsList, comboBoxSelector: ${comboBoxSelector}, filter: ${filterValue}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this._filterOptionsList(comboBox, filterValue);
      await this.closeOptionsList(comboBox);
    }

    async _filterOptionsList(comboBoxElement, filterValue) {
      const input = await comboBoxElement.findByTagName('input');
      await input.clearValue();
      await this._waitForOptionsListLoading(comboBoxElement);
      await input.type(filterValue);
      await this._waitForOptionsListLoading(comboBoxElement);
    }

    async _waitForOptionsListLoading(comboBoxElement) {
      await comboBoxElement.waitForDeletedByCssSelector('.euiLoadingSpinner');
    }

    async getOptionsList(comboBoxSelector) {
      log.debug(`comboBox.getOptionsList, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const menu = await retry.try(async () => {
        await testSubjects.click(comboBoxSelector);
        await this._waitForOptionsListLoading(comboBox);
        const isOptionsListOpen = await testSubjects.exists('comboBoxOptionsList');
        if (!isOptionsListOpen) {
          throw new Error('Combo box options list did not open on click');
        }
        return await testSubjects.find('comboBoxOptionsList');
      });
      const optionsText = await menu.getVisibleText();
      await this.closeOptionsList(comboBox);
      return optionsText;
    }

    async doesComboBoxHaveSelectedOptions(comboBoxSelector) {
      log.debug(`comboBox.doesComboBoxHaveSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const selectedOptions = await comboBox.findAllByClassName('euiComboBoxPill');
      return selectedOptions > 0;
    }

    async getComboBoxSelectedOptions(comboBoxSelector) {
      log.debug(`comboBox.getComboBoxSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      return await retry.try(async () => {
        const comboBox = await testSubjects.find(comboBoxSelector);
        const selectedOptions = await comboBox.findAllByClassName('euiComboBoxPill');
        if (selectedOptions.length === 0) {
          return [];
        }
        return Promise.all(selectedOptions.map(async (optionElement) => {
          return await optionElement.getVisibleText();
        }));
      });
    }

    async clear(comboBoxSelector) {
      log.debug(`comboBox.clear, comboBoxSelector:${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      await retry.try(async () => {
        const clearButtonExists = await this.doesClearButtonExist(comboBox);
        if (!clearButtonExists) {
          log.debug('Unable to clear comboBox, comboBoxClearButton does not exist');
          return;
        }

        const clearBtn = await comboBox.findByCssSelector('[data-test-subj="comboBoxClearButton"]');
        await clearBtn.click();

        const clearButtonStillExists = await this.doesClearButtonExist(comboBox);
        if (clearButtonStillExists) {
          throw new Error('Failed to clear comboBox');
        }
      });
      await this.closeOptionsList(comboBox);
    }

    async doesClearButtonExist(comboBoxElement) {
      return await find.exists(
        async () => await comboBoxElement.findByCssSelector('[data-test-subj="comboBoxClearButton"]'));
    }

    async closeOptionsList(comboBoxElement) {
      const isOptionsListOpen = await testSubjects.exists('comboBoxOptionsList');
      if (isOptionsListOpen) {
        const toggleBtn = await comboBoxElement.findByCssSelector('[data-test-subj="comboBoxToggleListButton"]');
        await toggleBtn.click();
      }
    }

    async openOptionsList(comboBoxElement) {
      const isOptionsListOpen = await testSubjects.exists('comboBoxOptionsList');
      if (!isOptionsListOpen) {
        const toggleBtn = await comboBoxElement.findByCssSelector('[data-test-subj="comboBoxToggleListButton"]');
        await toggleBtn.click();
      }
    }

  }

  return new ComboBox();
}
