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
    const editor = await (await this.testSubjects.find('valueRow')).findByClassName(
      'react-monaco-editor-container'
    );
    const textarea = await editor.findByClassName('monaco-mouse-cursor-text');

    await textarea.click();
    await this.browser.pressKeys(script);
  }
  public async save() {
    await this.testSubjects.click('fieldSaveButton');
  }

  public async confirmSave() {
    await this.testSubjects.setValue('saveModalConfirmText', 'change');
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  public async confirmDelete() {
    await this.testSubjects.setValue('deleteModalConfirmText', 'remove');
    await this.testSubjects.click('confirmModalConfirmButton');
  }
}
