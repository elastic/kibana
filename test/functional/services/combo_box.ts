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
import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';

export function ComboBoxProvider({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);

  const WAIT_FOR_EXISTS_TIME: number = config.get('timeouts.waitForExists');

  // wrapper around EuiComboBox interactions
  class ComboBox {
    /**
     * set value inside combobox
     *
     * @param comboBoxSelector test subject selector
     * @param value
     */
    public async set(comboBoxSelector: string, value: string): Promise<void> {
      log.debug(`comboBox.set, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this.setElement(comboBox, value);
    }

    /**
     * set value inside combobox element
     *
     * @param comboBoxElement
     * @param value
     */
    public async setElement(comboBoxElement: WebElementWrapper, value: string): Promise<void> {
      log.debug(`comboBox.setElement, value: ${value}`);
      const isOptionSelected = await this.isOptionSelected(comboBoxElement, value);

      if (isOptionSelected) {
        return;
      }

      await this._filterOptionsList(comboBoxElement, value);
      await this.openOptionsList(comboBoxElement);

      if (value !== undefined) {
        const options = await find.allByCssSelector(
          `.euiFilterSelectItem[title^="${value.toString().trim()}"]`,
          WAIT_FOR_EXISTS_TIME
        );

        if (options.length > 0) {
          await options[0].click();
        } else {
          // if it doesn't find the item which text starts with value, it will choose the first option
          await find.clickByCssSelector('.euiFilterSelectItem');
        }
      } else {
        await find.clickByCssSelector('.euiFilterSelectItem');
      }

      await this.closeOptionsList(comboBoxElement);
    }

    /**
     * This method set custom value to comboBox.
     * It applies changes by pressing Enter key. Sometimes it may lead to auto-submitting a form.
     *
     * @param comboBoxSelector test subject selector
     * @param value
     */
    async setCustom(comboBoxSelector: string, value: string) {
      log.debug(`comboBox.setCustom, comboBoxSelector: ${comboBoxSelector}, value: ${value}`);
      const comboBoxElement = await testSubjects.find(comboBoxSelector);
      await this._filterOptionsList(comboBoxElement, value);
      await PageObjects.common.pressEnterKey();
      await this.closeOptionsList(comboBoxElement);
    }

    async filterOptionsList(comboBoxSelector: string, filterValue: string) {
      log.debug(
        `comboBox.filterOptionsList, comboBoxSelector: ${comboBoxSelector}, filter: ${filterValue}`
      );
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this._filterOptionsList(comboBox, filterValue);
      await this.closeOptionsList(comboBox);
    }

    private async _filterOptionsList(
      comboBoxElement: WebElementWrapper,
      filterValue: string
    ): Promise<void> {
      const input = await comboBoxElement.findByTagName('input');
      await input.clearValue();
      await this.waitForOptionsListLoading(comboBoxElement);
      await input.type(filterValue);
      await this.waitForOptionsListLoading(comboBoxElement);
    }

    private async waitForOptionsListLoading(comboBoxElement: WebElementWrapper): Promise<void> {
      await comboBoxElement.waitForDeletedByCssSelector('.euiLoadingSpinner');
    }

    public async getOptionsList(comboBoxSelector: string): Promise<string> {
      log.debug(`comboBox.getOptionsList, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const menu = await retry.try(async () => {
        await testSubjects.click(comboBoxSelector);
        await this.waitForOptionsListLoading(comboBox);
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

    public async doesComboBoxHaveSelectedOptions(comboBoxSelector: string): Promise<boolean> {
      log.debug(`comboBox.doesComboBoxHaveSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const selectedOptions = await comboBox.findAllByClassName(
        'euiComboBoxPill',
        WAIT_FOR_EXISTS_TIME
      );
      return selectedOptions.length > 0;
    }

    public async getComboBoxSelectedOptions(comboBoxSelector: string): Promise<string[]> {
      log.debug(`comboBox.getComboBoxSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      return await retry.try(async () => {
        const comboBox = await testSubjects.find(comboBoxSelector);
        const selectedOptions = await comboBox.findAllByClassName(
          'euiComboBoxPill',
          WAIT_FOR_EXISTS_TIME
        );
        if (selectedOptions.length === 0) {
          return [];
        }
        return Promise.all(
          selectedOptions.map(async optionElement => {
            return await optionElement.getVisibleText();
          })
        );
      });
    }

    /**
     * clearing value from combobox
     *
     * @param comboBoxSelector data-test-subj selector
     */
    public async clear(comboBoxSelector: string): Promise<void> {
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

    public async doesClearButtonExist(comboBoxElement: WebElementWrapper): Promise<boolean> {
      const found = await comboBoxElement.findAllByCssSelector(
        '[data-test-subj="comboBoxClearButton"]',
        WAIT_FOR_EXISTS_TIME
      );
      return found.length > 0;
    }

    /**
     * closing option list for combobox
     *
     * @param comboBoxElement
     */
    public async closeOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
      const isOptionsListOpen = await testSubjects.exists('comboBoxOptionsList');
      if (isOptionsListOpen) {
        const input = await comboBoxElement.findByTagName('input');
        await input.pressKeys(browser.keys.ESCAPE);
      }
    }

    /**
     * opened list of options for combobox
     *
     * @param comboBoxElement
     */
    public async openOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
      const isOptionsListOpen = await testSubjects.exists('comboBoxOptionsList');
      if (!isOptionsListOpen) {
        const toggleBtn = await comboBoxElement.findByCssSelector(
          '[data-test-subj="comboBoxToggleListButton"]'
        );
        await toggleBtn.click();
      }
    }

    /**
     * check if option is already selected
     *
     * @param comboBoxElement
     * @param value
     */
    public async isOptionSelected(
      comboBoxElement: WebElementWrapper,
      value: string
    ): Promise<boolean> {
      log.debug(`comboBox.isOptionSelected, value: ${value}`);
      const selectedOptions = await comboBoxElement.findAllByClassName(
        'euiComboBoxPill',
        WAIT_FOR_EXISTS_TIME
      );
      return selectedOptions.length === 1 && (await selectedOptions[0].getVisibleText()) === value;
    }
  }

  return new ComboBox();
}
