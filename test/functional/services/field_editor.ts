/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class FieldEditorService extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');

  public async setName(name: string, clearFirst = false, typeCharByChar = false) {
    await this.testSubjects.setValue('nameField > input', name, {
      clearWithKeyboard: clearFirst,
      typeCharByChar,
    });
  }
  public async enableCustomLabel() {
    await this.testSubjects.setEuiSwitch('customLabelRow > toggle', 'check');
  }
  public async setCustomLabel(name: string) {
    await this.testSubjects.setValue('customLabelRow > input', name);
  }
  public async enableValue() {
    await this.testSubjects.setEuiSwitch('valueRow > toggle', 'check');
  }
  public async disableValue() {
    await this.testSubjects.setEuiSwitch('valueRow > toggle', 'uncheck');
  }
  public async typeScript(script: string) {
    const editor = await (
      await this.testSubjects.find('valueRow')
    ).findByClassName('react-monaco-editor-container');
    const textarea = await editor.findByClassName('monaco-mouse-cursor-text');

    await textarea.click();

    // To avoid issue with the timing needed for Selenium to write the script and the monaco editor
    // syntax validation kicking in, we loop through all the chars of the script and enter
    // them one by one (instead of calling "await this.browser.pressKeys(script);").
    for (const letter of script.split('')) {
      await this.browser.pressKeys(letter);
    }
  }
  public async save() {
    await this.testSubjects.click('fieldSaveButton');
  }

  async setUrlFieldFormat(template: string) {
    const urlTemplateField = await this.find.byCssSelector(
      'input[data-test-subj="urlEditorUrlTemplate"]'
    );
    await urlTemplateField.type(template);
  }

  public async setStaticLookupFormat(oldValue: string, newValue: string) {
    await this.testSubjects.click('staticLookupEditorAddEntry');
    await this.testSubjects.setValue('~staticLookupEditorKey', oldValue);
    await this.testSubjects.setValue('~staticLookupEditorValue', newValue);
  }

  public async setColorFormat(value: string, color: string, backgroundColor?: string) {
    await this.testSubjects.click('colorEditorAddColor');
    await this.testSubjects.setValue('~colorEditorKeyPattern', value);
    await this.testSubjects.setValue('~colorEditorColorPicker', color);
    if (backgroundColor) {
      await this.testSubjects.setValue('~colorEditorBackgroundPicker', backgroundColor);
    }
  }

  public async setStringFormat(transform: string) {
    await this.testSubjects.selectValue('stringEditorTransform', transform);
  }

  public async setTruncateFormatLength(length: string) {
    await this.testSubjects.setValue('truncateEditorLength', length);
  }

  public async setFieldFormat(format: string) {
    await this.find.clickByCssSelector(
      'select[data-test-subj="editorSelectedFormatId"] > option[value="' + format + '"]'
    );
  }

  public async setFormat(format: string) {
    await this.testSubjects.setEuiSwitch('formatRow > toggle', 'check');
    await this.setFieldFormat(format);
  }

  public async confirmSave() {
    await this.retry.try(async () => {
      await this.testSubjects.setValue('saveModalConfirmText', 'change');
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 1000,
      });
    });
  }

  public async confirmDelete() {
    await this.retry.try(async () => {
      await this.testSubjects.setValue('deleteModalConfirmText', 'remove');
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 1000,
      });
    });
  }
}
