/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Key } from 'selenium-webdriver';
import { asyncForEach } from '@kbn/std';
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

  public async openVariablesModal() {
    await this.testSubjects.click('consoleVariablesButton');
  }

  public async closeVariablesModal() {
    await this.testSubjects.click('variablesCancelButton');
  }

  public async addNewVariable({ name, value }: { name: string; value: string }) {
    await this.openVariablesModal();

    // while the variables form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      await this.testSubjects.click('variablesAddButton');

      const variableNameInputs = await this.testSubjects.findAll('variablesNameInput');
      await variableNameInputs[variableNameInputs.length - 1].type(name);

      const variableValueInputs = await this.testSubjects.findAll('variablesValueInput');
      await variableValueInputs[variableValueInputs.length - 1].type(value);
    });

    await this.testSubjects.click('variablesSaveButton');
  }

  public async removeVariables() {
    await this.openVariablesModal();

    // while the variables form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const buttons = await this.testSubjects.findAll('variablesRemoveButton');
      await asyncForEach(buttons, async (button) => {
        await button.click();
      });
    });
    await this.testSubjects.click('variablesSaveButton');
  }

  public async getVariables() {
    await this.openVariablesModal();
    const inputs = await this.testSubjects.findAll('variablesNameInput');
    const variables = await Promise.all(
      inputs.map(async (input) => await input.getAttribute('value'))
    );
    await this.closeVariablesModal();
    return variables;
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

  // Prompt autocomplete window and provide a initial letter of properties to narrow down the results. E.g. 'b' = 'bool'
  public async promptAutocomplete(letter = 'b') {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.clickMouseButton();
    await textArea.type(letter);
    await this.retry.waitFor('autocomplete to be visible', () => this.isAutocompleteVisible());
  }

  public async isAutocompleteVisible() {
    const element = await this.find.byCssSelector('.ace_autocomplete');
    if (!element) return false;

    const attribute = await element.getAttribute('style');
    return !attribute.includes('display: none;');
  }

  public async enterRequest(request: string = '\nGET _search') {
    const textArea = await this.getEditorTextArea();
    await textArea.pressKeys(request);
  }

  public async enterText(text: string) {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.type(text);
  }

  private async getEditorTextArea() {
    // This focusses the cursor on the bottom of the text area
    await this.retry.try(async () => {
      const editor = await this.getEditor();
      const content = await editor.findByCssSelector('.ace_content');
      await content.click();
    });
    return await this.testSubjects.find('console-textarea');
  }

  public async getAllTextLines() {
    const editor = await this.getEditor();
    return await editor.findAllByClassName('ace_line_group');
  }

  public async getAllVisibleText() {
    let textString = '';
    const textLineElements = await this.getAllTextLines();
    for (let i = 0; i < textLineElements.length; i++) {
      textString = textString.concat(await textLineElements[i].getVisibleText());
    }
    return textString;
  }

  public async getVisibleTextAt(lineIndex: number) {
    const lines = await this.getAllTextLines();
    if (lines.length < lineIndex) {
      throw new Error(`No line with index: ${lineIndex}`);
    }

    const line = lines[lineIndex];
    const text = await line.getVisibleText();

    return text.trim();
  }

  public async pressEnter() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(Key.ENTER);
  }

  public async clearTextArea() {
    await this.retry.waitForWithTimeout('text area is cleared', 20000, async () => {
      const textArea = await this.testSubjects.find('console-textarea');
      await textArea.clickMouseButton();
      await textArea.clearValueWithKeyboard();

      const editor = await this.getEditor();
      const lines = await editor.findAllByClassName('ace_line_group');
      // there should be only one empty line after clearing the textarea
      const text = await lines[lines.length - 1].getVisibleText();
      return lines.length === 1 && text.trim() === '';
    });
  }

  public async selectAllRequests() {
    const editor = await this.getEditorTextArea();
    const selectionKey = Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'];
    await editor.pressKeys([selectionKey, 'a']);
  }

  public async hasSuccessBadge() {
    return await this.find.existsByCssSelector('.ace_badge--success');
  }

  public async hasWarningBadge() {
    return await this.find.existsByCssSelector('.ace_badge--warning');
  }

  public async hasInvalidSyntax() {
    return await this.find.existsByCssSelector('.ace_invalid');
  }

  public async hasErrorMarker() {
    return await this.find.existsByCssSelector('.ace_error');
  }

  public async clickFoldWidget() {
    const widget = await this.find.byCssSelector('.ace_fold-widget');
    await widget.click();
  }

  public async hasFolds() {
    return await this.find.existsByCssSelector('.ace_fold');
  }

  public async getResponseStatus() {
    const statusBadge = await this.testSubjects.find('consoleResponseStatusBadge');
    const text = await statusBadge.getVisibleText();
    return text.replace(/[^\d.]+/, '');
  }

  async closeHelpIfExists() {
    await this.retry.try(async () => {
      const helpPanelShown = await this.testSubjects.exists('help-close-button');
      if (helpPanelShown) {
        await this.collapseHelp();
      }
    });
  }
}
