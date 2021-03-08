/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function FieldEditorProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  class FieldEditor {
    public async setName(name: string) {
      await testSubjects.setValue('nameField > input', name);
    }
    public async enableValue() {
      await testSubjects.setEuiSwitch('valueRow > toggle', 'check');
    }
    public async disableValue() {
      await testSubjects.setEuiSwitch('valueRow > toggle', 'uncheck');
    }
    public async typeScript(script: string) {
      const editor = await (await testSubjects.find('valueRow')).findByClassName(
        'react-monaco-editor-container'
      );
      const textarea = await editor.findByClassName('monaco-mouse-cursor-text');

      await textarea.click();
      await browser.pressKeys(script);
    }
    public async save() {
      await retry.try(async () => {
        await testSubjects.click('fieldSaveButton');
        await testSubjects.missingOrFail('fieldSaveButton', { timeout: 2000 });
      });
    }
  }

  return new FieldEditor();
}
