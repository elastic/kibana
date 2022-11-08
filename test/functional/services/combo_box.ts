/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';
// @ts-ignore not supported yet
import { scrollIntoViewIfNecessary } from './lib/web_element_wrapper/scroll_into_view_if_necessary';

/**
 * wrapper around EuiComboBox interactions
 */
export class ComboBoxService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly common = this.ctx.getPageObject('common');

  private readonly WAIT_FOR_EXISTS_TIME: number = this.config.get('timeouts.waitForExists');

  /**
   * Finds combobox element and sets specified value
   *
   * @param comboBoxSelector data-test-subj selector
   * @param value option text
   */

  public async set(comboBoxSelector: string, value: string): Promise<void> {
    this.log.debug(`comboBox.set, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    await this.setElement(comboBox, value);
  }

  /**
   * Clicks option in combobox dropdown
   *
   * @param isMouseClick if 'true', click will be done with mouse
   * @param element element that wraps up option
   */
  private async clickOption(isMouseClick: boolean, element: WebElementWrapper): Promise<void> {
    // element.click causes scrollIntoView which causes combobox to close, using _webElement.click instead
    await this.retry.try(async () => {
      return isMouseClick ? await element.clickMouseButton() : await element._webElement.click();
    });
  }

  /**
   * Finds combobox element options
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async getOptions(comboBoxSelector: string) {
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    await this.openOptionsList(comboBoxElement);
    return await this.find.allByCssSelector('.euiFilterSelectItem', this.WAIT_FOR_EXISTS_TIME);
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
    this.log.debug(`comboBox.setElement, value: ${value}`);
    const isOptionSelected = await this.isOptionSelected(comboBoxElement, value);

    if (isOptionSelected) {
      return;
    }

    await comboBoxElement.scrollIntoViewIfNecessary();
    await this.setFilterValue(comboBoxElement, value);
    await this.openOptionsList(comboBoxElement);

    if (value !== undefined) {
      const selectOptions = await this.find.allByCssSelector(
        `.euiFilterSelectItem[title^="${value.toString().trim()}"]`,
        this.WAIT_FOR_EXISTS_TIME
      );

      if (selectOptions.length > 0) {
        await this.clickOption(options.clickWithMouse, selectOptions[0]);
      } else {
        // if it doesn't find the item which text starts with value, it will choose the first option
        const firstOption = await this.find.byCssSelector('.euiFilterSelectItem', 5000);
        await this.clickOption(options.clickWithMouse, firstOption);
      }
    } else {
      const firstOption = await this.find.byCssSelector('.euiFilterSelectItem');
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
    this.log.debug(`comboBox.setCustom, comboBoxSelector: ${comboBoxSelector}, value: ${value}`);
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    await this.setFilterValue(comboBoxElement, value);
    await this.common.pressEnterKey();
    await this.closeOptionsList(comboBoxElement);
  }

  /**
   * Finds combobox element and sets filter value
   *
   * @param comboBoxSelector data-test-subj selector
   * @param filterValue text
   */
  public async filterOptionsList(comboBoxSelector: string, filterValue: string): Promise<void> {
    this.log.debug(
      `comboBox.filterOptionsList, comboBoxSelector: ${comboBoxSelector}, filter: ${filterValue}`
    );
    const comboBox = await this.testSubjects.find(comboBoxSelector);
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
    this.log.debug(`comboBox.getOptionsList, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const menu = await this.retry.try(async () => {
      await this.testSubjects.click(comboBoxSelector);
      await this.waitForOptionsListLoading(comboBox);
      const isOptionsListOpen = await this.testSubjects.exists('~comboBoxOptionsList');
      if (!isOptionsListOpen) {
        throw new Error('Combo box options list did not open on click');
      }
      return await this.testSubjects.find('~comboBoxOptionsList');
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
    this.log.debug(
      `comboBox.doesComboBoxHaveSelectedOptions, comboBoxSelector: ${comboBoxSelector}`
    );
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const $ = await comboBox.parseDomContent();
    return $('.euiComboBoxPill').toArray().length > 0;
  }

  /**
   * Returns selected options
   * @param comboBoxSelector data-test-subj selector
   */
  public async getComboBoxSelectedOptions(comboBoxSelector: string): Promise<string[]> {
    this.log.debug(`comboBox.getComboBoxSelectedOptions, comboBoxSelector: ${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    const $ = await comboBox.parseDomContent();
    return $('.euiComboBoxPill')
      .toArray()
      .map((option) => $(option).text());
  }

  /**
   * Finds combobox element and clears value in the input field by clicking clear button
   *
   * @param comboBoxSelector data-test-subj selector
   */
  public async clear(comboBoxSelector: string): Promise<void> {
    this.log.debug(`comboBox.clear, comboBoxSelector:${comboBoxSelector}`);
    const comboBox = await this.testSubjects.find(comboBoxSelector);
    await this.retry.try(async () => {
      const clearButtonExists = await this.doesClearButtonExist(comboBox);
      if (!clearButtonExists) {
        this.log.debug('Unable to clear comboBox, comboBoxClearButton does not exist');
        return;
      }

      const clearBtn = await comboBox.findByTestSubject('comboBoxClearButton');
      await clearBtn.click();

      const clearButtonStillExists = await this.doesClearButtonExist(comboBox);
      if (clearButtonStillExists) {
        throw new Error('Failed to clear comboBox');
      }
    });
    await this.closeOptionsList(comboBox);
  }

  public async doesClearButtonExist(comboBoxElement: WebElementWrapper): Promise<boolean> {
    const found = await comboBoxElement.findAllByTestSubject(
      'comboBoxClearButton',
      this.WAIT_FOR_EXISTS_TIME
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
    const isOptionsListOpen = await this.testSubjects.exists('~comboBoxOptionsList');
    if (isOptionsListOpen) {
      const input = await comboBoxElement.findByTagName('input');
      await input.pressKeys(this.browser.keys.ESCAPE);
    }
  }

  /**
   * Opens options list
   *
   * @param comboBoxElement element that wraps up EuiComboBox
   */
  public async openOptionsList(comboBoxElement: WebElementWrapper): Promise<void> {
    const isOptionsListOpen = await this.testSubjects.exists('~comboBoxOptionsList');
    if (!isOptionsListOpen) {
      await this.retry.try(async () => {
        const toggleBtn = await comboBoxElement.findByTestSubject('comboBoxInput');
        await toggleBtn.click();
      });
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
    this.log.debug(`comboBox.isOptionSelected, value: ${value}`);
    const $ = await comboBoxElement.parseDomContent();
    const selectedOptions = $('.euiComboBoxPill')
      .toArray()
      .map((option) => $(option).text());
    return selectedOptions.length === 1 && selectedOptions[0] === value;
  }

  /**
   * Clears input field
   * @param comboBoxSelector data-test-subj selector
   */
  public async clearInputField(comboBoxSelector: string): Promise<void> {
    this.log.debug(`comboBox.clearInputField, comboBoxSelector:${comboBoxSelector}`);
    const comboBoxElement = await this.testSubjects.find(comboBoxSelector);
    const input = await comboBoxElement.findByTagName('input');
    await input.clearValueWithKeyboard();
  }
}
