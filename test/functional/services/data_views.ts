/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

interface DataViewOptions {
  name: string;
  adHoc?: boolean;
  hasTimeField?: boolean;
}

export class DataViewsService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly comboBox = this.ctx.getService('comboBox');

  private async create({ name, adHoc = false, hasTimeField = false }: DataViewOptions) {
    await this.testSubjects.existOrFail('indexPatternEditorFlyout');
    await this.testSubjects.setValue('createIndexPatternTitleInput', name, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    if (hasTimeField) {
      await this.retry.waitFor('timestamp field loaded', async () => {
        const timestampField = await this.testSubjects.find('timestampField');
        return !(await timestampField.elementHasClass('euiComboBox-isDisabled'));
      });
    }
    await this.testSubjects.click(adHoc ? 'exploreIndexPatternButton' : 'saveIndexPatternButton');
  }

  /**
   * Create a new Data View from top search bar
   */
  async createFromSearchBar({ name, adHoc = false, hasTimeField = false }: DataViewOptions) {
    await this.testSubjects.click('*dataView-switch-link');
    await this.testSubjects.click('dataview-create-new');
    await this.create({ name, adHoc, hasTimeField });
  }

  /**
   * Create the first Data View from Prompt, e.g. on Dashboard
   */
  async createFromPrompt({ name, adHoc = false, hasTimeField = false }: DataViewOptions) {
    await this.testSubjects.click('createDataViewButton');
    await this.create({ name, adHoc, hasTimeField });
  }

  /**
   * Returns name for the currently selected Data View
   */
  async getSelectedName() {
    return this.testSubjects.getVisibleText('*dataView-switch-link');
  }

  /**
   * Checks if currently selected Data View has AdHoc image
   */
  async isAdHoc() {
    const buttonEl = await this.testSubjects.find('*dataView-switch-link');
    const adHocImages = await buttonEl.findAllByCssSelector(
      'img[class*="_dataview--createTrigger"]'
    );
    return adHocImages.length > 0;
  }

  /**
   * Opens Create field flayout for the selected Data View
   */
  async clickAddFieldFromSearchBar() {
    await this.testSubjects.click('*dataView-switch-link');
    await this.testSubjects.click('indexPattern-add-field');
    await this.testSubjects.existOrFail('fieldEditor');
  }

  /**
   * Switch Data View from top search bar
   */
  public async switchTo(name: string) {
    const selectedDataView = await this.getSelectedName();
    if (name === selectedDataView) {
      return;
    }
    await this.testSubjects.click('*dataView-switch-link');
    await this.testSubjects.existOrFail('indexPattern-switcher');
    await this.testSubjects.setValue('indexPattern-switcher--input', name);
    await this.find.clickByCssSelector(`[title="${name}"]`);
    await this.waitForSwitcherToBe(name);
  }

  /**
   * Waits for selected Data View to equal name argument
   */
  public async waitForSwitcherToBe(name: string) {
    await this.retry.waitFor(
      'Data View switcher to be updated',
      async () => (await this.getSelectedName()) === name
    );
  }

  /**
   * Edit currently selected Data View
   */
  public async editFromSearchBar({
    newName,
    newTimeField,
  }: {
    newName?: string;
    newTimeField?: string;
  }) {
    await this.testSubjects.click('*dataView-switch-link');
    await this.testSubjects.click('indexPattern-manage-field');
    await this.testSubjects.existOrFail('indexPatternEditorFlyout');
    if (newName) {
      await this.testSubjects.setValue('createIndexPatternTitleInput', newName, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
    }
    if (newTimeField) {
      await this.comboBox.set('timestampField', newTimeField);
    }
    await this.testSubjects.click('saveIndexPatternButton');
    if (await this.testSubjects.exists('confirmModalConfirmButton')) {
      await this.testSubjects.click('confirmModalConfirmButton');
    }
  }
}
