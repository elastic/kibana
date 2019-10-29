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
// @ts-ignore not supported yet
import { scrollIntoViewIfNecessary } from './lib/web_element_wrapper/scroll_into_view_if_necessary';

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
     * Finds combobox element and sets specified value
     *
     * @param comboBoxSelector data-test-subj selector
     * @param value option text
     */

    public async set(comboBoxSelector: string, value: string): Promise<void> {
      log.debug(`comboBox.set, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this.setElement(comboBox, value);
    }

    /**
     * Clicks option in combobox dropdown
     *
     * @param isMouseClick if 'true', click will be done with mouse
     * @param element element that wraps up option
     */
    private async clickOption(isMouseClick: boolean, element: WebElementWrapper): Promise<void> {
      return isMouseClick ? await element.clickMouseButton() : await element.click();
    }

    /**
     * Sets value for specified combobox element
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     * @param value
     */
    public async setElement(
      comboBoxElement: WebElementWrapper,
      value: string,
      options = { clickWithMouse: false }
    ): Promise<void> {
      log.debug(`comboBox.setElement, value: ${value}`);
      const isOptionSelected = await this.isOptionSelected(comboBoxElement, value);

      if (isOptionSelected) {
        return;
      }

      await comboBoxElement.scrollIntoViewIfNecessary();
      await this.setFilterValue(comboBoxElement, value);
      await this.openOptionsList(comboBoxElement);

      if (value !== undefined) {
        const selectOptions = await find.allByCssSelector(
          `.euiFilterSelectItem[title^="${value.toString().trim()}"]`,
          WAIT_FOR_EXISTS_TIME
        );

        if (selectOptions.length > 0) {
          await this.clickOption(options.clickWithMouse, selectOptions[0]);
        } else {
          // if it doesn't find the item which text starts with value, it will choose the first option
          const firstOption = await find.byCssSelector('.euiFilterSelectItem');
          await this.clickOption(options.clickWithMouse, firstOption);
        }
      } else {
        const firstOption = await find.byCssSelector('.euiFilterSelectItem');
        await this.clickOption(options.clickWithMouse, firstOption);
      }
      await this.closeOptionsList(comboBoxElement);
    }

    /**
     * Finds combobox element and sets custom value
     * It applies changes by pressing Enter key. Sometimes it may lead to auto-submitting a form.
     *
     * @param comboBoxSelector data-test-subj selector
     * @param value option text
     */
    public async setCustom(comboBoxSelector: string, value: string): Promise<void> {
      log.debug(`comboBox.setCustom, comboBoxSelector: ${comboBoxSelector}, value: ${value}`);
      const comboBoxElement = await testSubjects.find(comboBoxSelector);
      await this.setFilterValue(comboBoxElement, value);
      await PageObjects.common.pressEnterKey();
      await this.closeOptionsList(comboBoxElement);
    }

    /**
     * Finds combobox element and sets filter value
     *
     * @param comboBoxSelector data-test-subj selector
     * @param filterValue text
     */
    public async filterOptionsList(comboBoxSelector: string, filterValue: string): Promise<void> {
      log.debug(
        `comboBox.filterOptionsList, comboBoxSelector: ${comboBoxSelector}, filter: ${filterValue}`
      );
      const comboBox = await testSubjects.find(comboBoxSelector);
      await this.setFilterValue(comboBox, filterValue);
      await this.closeOptionsList(comboBox);
    }

    /**
     * Sets new filter value in specified combobox element
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     * @param filterValue text
     */
    private async setFilterValue(
      comboBoxElement: WebElementWrapper,
      filterValue: string
    ): Promise<void> {
      const input = await comboBoxElement.findByTagName('input');
      await input.clearValue();
      await this.waitForOptionsListLoading(comboBoxElement);
      await input.type(filterValue);
      await this.waitForOptionsListLoading(comboBoxElement);
    }

    /**
     * Waits options list to be loaded
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     */
    private async waitForOptionsListLoading(comboBoxElement: WebElementWrapper): Promise<void> {
      await comboBoxElement.waitForDeletedByCssSelector('.euiLoadingSpinner');
    }

    /**
     * Returns options list as a single string
     *
     * @param comboBoxSelector data-test-subj selector
     */
    public async getOptionsList(comboBoxSelector: string): Promise<string> {
      log.debug(`comboBox.getOptionsList, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const menu = await retry.try(async () => {
        await testSubjects.click(comboBoxSelector);
        await this.waitForOptionsListLoading(comboBox);
        const isOptionsListOpen = await testSubjects.exists('~comboBoxOptionsList');
        if (!isOptionsListOpen) {
          throw new Error('Combo box options list did not open on click');
        }
        return await testSubjects.find('~comboBoxOptionsList');
      });
      const optionsText = await menu.getVisibleText();
      await this.closeOptionsList(comboBox);
      return optionsText;
    }

    /**
     * Finds combobox element and checks if it has selected options
     *
     * @param comboBoxSelector data-test-subj selector
     */
    public async doesComboBoxHaveSelectedOptions(comboBoxSelector: string): Promise<boolean> {
      log.debug(`comboBox.doesComboBoxHaveSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const $ = await comboBox.parseDomContent();
      return $('.euiComboBoxPill').toArray().length > 0;
    }

    /**
     * Returns selected options
     * @param comboBoxSelector data-test-subj selector
     */
    public async getComboBoxSelectedOptions(comboBoxSelector: string): Promise<string[]> {
      log.debug(`comboBox.getComboBoxSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
      const comboBox = await testSubjects.find(comboBoxSelector);
      const $ = await comboBox.parseDomContent();
      return $('.euiComboBoxPill')
        .toArray()
        .map(option => $(option).text());
    }

    /**
     * Finds combobox element and clears value in the input field by clicking clear button
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

    public async checkValidity(comboBoxElement: WebElementWrapper): Promise<boolean> {
      const invalidClassName = 'euiComboBox-isInvalid';

      return !(await comboBoxElement.elementHasClass(invalidClassName));
    }

    /**
     * Closes options list
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     */
    public async closeOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
      const isOptionsListOpen = await testSubjects.exists('~comboBoxOptionsList');
      if (isOptionsListOpen) {
        const input = await comboBoxElement.findByTagName('input');
        await input.pressKeys(browser.keys.ESCAPE);
      }
    }

    /**
     * Opens options list
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     */
    public async openOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
      const isOptionsListOpen = await testSubjects.exists('~comboBoxOptionsList');
      if (!isOptionsListOpen) {
        const toggleBtn = await comboBoxElement.findByCssSelector(
          '[data-test-subj="comboBoxToggleListButton"]'
        );
        await toggleBtn.click();
      }
    }

    /**
     * Checks if specified option is already selected
     *
     * @param comboBoxElement element that wraps up EuiComboBox
     * @param value option text
     */
    public async isOptionSelected(
      comboBoxElement: WebElementWrapper,
      value: string
    ): Promise<boolean> {
      log.debug(`comboBox.isOptionSelected, value: ${value}`);
      const $ = await comboBoxElement.parseDomContent();
      const selectedOptions = $('.euiComboBoxPill')
        .toArray()
        .map(option => $(option).text());
      return selectedOptions.length === 1 && selectedOptions[0] === value;
    }

    /**
     * Clears input field
     * @param comboBoxSelector data-test-subj selector
     */
    public async clearInputField(comboBoxSelector: string): Promise<void> {
      log.debug(`comboBox.clearInputField, comboBoxSelector:${comboBoxSelector}`);
      const comboBoxElement = await testSubjects.find(comboBoxSelector);
      const input = await comboBoxElement.findByTagName('input');
      await input.clearValueWithKeyboard();
    }
  }

  return new ComboBox();
}
