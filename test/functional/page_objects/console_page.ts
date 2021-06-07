/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Key } from 'selenium-webdriver';
import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export class ConsolePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');

  public async getVisibleTextFromAceEditor(editor: WebElementWrapper) {
    const lines = await editor.findAllByClassName('ace_line_group');
    const linesText = await Promise.all(lines.map(async (line) => await line.getVisibleText()));
    return linesText.join('\n');
  }

  public async getRequestEditor() {
    return await this.testSubjects.find('request-editor');
  }

  public async getRequest() {
    const requestEditor = await this.getRequestEditor();
    return await this.getVisibleTextFromAceEditor(requestEditor);
  }

  public async getResponse() {
    const responseEditor = await this.testSubjects.find('response-editor');
    return await this.getVisibleTextFromAceEditor(responseEditor);
  }

  public async clickPlay() {
    await this.testSubjects.click('sendRequestButton');
  }

  public async collapseHelp() {
    await this.testSubjects.click('help-close-button');
  }

  public async openSettings() {
    await this.testSubjects.click('consoleSettingsButton');
  }

  public async setFontSizeSetting(newSize: number) {
    await this.openSettings();

    // while the settings form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const fontSizeInput = await this.testSubjects.find('setting-font-size-input');
      await fontSizeInput.clearValue({ withJS: true });
      await fontSizeInput.click();
      await fontSizeInput.type(String(newSize));
    });

    await this.testSubjects.click('settings-save-button');
  }

  public async getFontSize(editor: WebElementWrapper) {
    const aceLine = await editor.findByClassName('ace_line');
    return await aceLine.getComputedStyle('font-size');
  }

  public async getRequestFontSize() {
    return await this.getFontSize(await this.getRequestEditor());
  }

  public async getEditor() {
    return this.testSubjects.find('console-application');
  }

  public async dismissTutorial() {
    try {
      const closeButton = await this.testSubjects.find('help-close-button');
      await closeButton.click();
    } catch (e) {
      // Ignore because it is probably not there.
    }
  }

  public async promptAutocomplete() {
    // This focusses the cursor on the bottom of the text area
    const editor = await this.getEditor();
    const content = await editor.findByCssSelector('.ace_content');
    await content.click();
    const textArea = await this.testSubjects.find('console-textarea');
    // There should be autocomplete for this on all license levels
    await textArea.pressKeys('\nGET s');
    await textArea.pressKeys([Key.CONTROL, Key.SPACE]);
  }

  public async hasAutocompleter(): Promise<boolean> {
    try {
      return Boolean(await this.find.byCssSelector('.ace_autocomplete'));
    } catch (e) {
      return false;
    }
  }
}
