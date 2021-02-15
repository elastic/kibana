/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export function ConsolePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  class ConsolePage {
    public async getVisibleTextFromAceEditor(editor: WebElementWrapper) {
      const lines = await editor.findAllByClassName('ace_line_group');
      const linesText = await Promise.all(lines.map(async (line) => await line.getVisibleText()));
      return linesText.join('\n');
    }

    public async getRequestEditor() {
      return await testSubjects.find('request-editor');
    }

    public async getRequest() {
      const requestEditor = await this.getRequestEditor();
      return await this.getVisibleTextFromAceEditor(requestEditor);
    }

    public async getResponse() {
      const responseEditor = await testSubjects.find('response-editor');
      return await this.getVisibleTextFromAceEditor(responseEditor);
    }

    public async clickPlay() {
      await testSubjects.click('sendRequestButton');
    }

    public async collapseHelp() {
      await testSubjects.click('help-close-button');
    }

    public async openSettings() {
      await testSubjects.click('consoleSettingsButton');
    }

    public async setFontSizeSetting(newSize: number) {
      await this.openSettings();

      // while the settings form opens/loads this may fail, so retry for a while
      await retry.try(async () => {
        const fontSizeInput = await testSubjects.find('setting-font-size-input');
        await fontSizeInput.clearValue({ withJS: true });
        await fontSizeInput.click();
        await fontSizeInput.type(String(newSize));
      });

      await testSubjects.click('settings-save-button');
    }

    public async getFontSize(editor: WebElementWrapper) {
      const aceLine = await editor.findByClassName('ace_line');
      return await aceLine.getComputedStyle('font-size');
    }

    public async getRequestFontSize() {
      return await this.getFontSize(await this.getRequestEditor());
    }
  }

  return new ConsolePage();
}
