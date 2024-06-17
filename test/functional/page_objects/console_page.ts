/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Key } from 'selenium-webdriver';
import { asyncForEach } from '@kbn/std';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class ConsolePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');

  public monaco = {
    getTextArea: async () => {
      const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
      return await codeEditor.findByTagName('textarea');
    },
    getEditorText: async () => {
      const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
      const editorViewDiv = await codeEditor.findByClassName('view-lines');
      return await editorViewDiv.getVisibleText();
    },
    getEditorTextAtLine: async (line: number) => {
      const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
      const editorViewDiv = await codeEditor.findAllByClassName('view-line');
      return await editorViewDiv[line].getVisibleText();
    },
    getCurrentLineNumber: async () => {
      const textArea = await this.monaco.getTextArea();
      const styleAttribute = (await textArea.getAttribute('style')) ?? '';
      const height = parseFloat(styleAttribute.replace(/.*height: ([+-]?\d+(\.\d+)?).*/, '$1'));
      const top = parseFloat(styleAttribute.replace(/.*top: ([+-]?\d+(\.\d+)?).*/, '$1'));
      // calculate the line number by dividing the top position by the line height
      // and adding 1 because line numbers start at 1
      return Math.ceil(top / height) + 1;
    },
    clearEditorText: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.clickMouseButton();
      await textArea.clearValueWithKeyboard();
    },
    getOutputText: async () => {
      const outputPanel = await this.testSubjects.find('consoleMonacoOutput');
      const outputViewDiv = await outputPanel.findByClassName('monaco-scrollable-element');
      return await outputViewDiv.getVisibleText();
    },
    pressEnter: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(Key.ENTER);
    },
    enterText: async (text: string) => {
      const textArea = await this.monaco.getTextArea();
      await textArea.type(text);
    },
    promptAutocomplete: async (letter = 'b') => {
      const textArea = await this.monaco.getTextArea();
      await textArea.type(letter);
      await this.retry.waitFor('autocomplete to be visible', () =>
        this.monaco.isAutocompleteVisible()
      );
    },
    isAutocompleteVisible: async () => {
      const element = await this.find.byClassName('suggest-widget').catch(() => null);
      if (!element) return false;

      const attribute = await element.getAttribute('style');
      return !attribute?.includes('display: none;');
    },
    getAutocompleteSuggestion: async (index: number) => {
      const suggestionsWidget = await this.find.byClassName('suggest-widget');
      const suggestions = await suggestionsWidget.findAllByClassName('monaco-list-row');
      const label = await suggestions[index].findByClassName('label-name');
      return label.getVisibleText();
    },
    pressUp: async (shift: boolean = false) => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(shift ? [Key.SHIFT, Key.UP] : Key.UP);
    },
    pressDown: async (shift: boolean = false) => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(shift ? [Key.SHIFT, Key.DOWN] : Key.DOWN);
    },
    pressRight: async (shift: boolean = false) => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(shift ? [Key.SHIFT, Key.RIGHT] : Key.RIGHT);
    },
    pressLeft: async (shift: boolean = false) => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(shift ? [Key.SHIFT, Key.LEFT] : Key.LEFT);
    },
    pressCtrlSpace: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([
        Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
        Key.SPACE,
      ]);
    },
    pressCtrlEnter: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([
        Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
        Key.ENTER,
      ]);
    },
    pressCtrlI: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'i']);
    },
    pressCtrlUp: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([
        Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
        Key.UP,
      ]);
    },
    pressCtrlDown: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([
        Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
        Key.DOWN,
      ]);
    },
    pressCtrlL: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'l']);
    },
    pressCtrlSlash: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], '/']);
    },
    pressEscape: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys(Key.ESCAPE);
    },
    selectAllRequests: async () => {
      const textArea = await this.monaco.getTextArea();
      const selectionKey = Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'];
      await textArea.pressKeys([selectionKey, 'a']);
    },
    getEditor: async () => {
      return await this.testSubjects.find('consoleMonacoEditor');
    },
    hasInvalidSyntax: async () => {
      return await this.find.existsByCssSelector('.squiggly-error');
    },
    responseHasDeprecationWarning: async () => {
      const response = await this.monaco.getOutputText();
      return response.trim().startsWith('#!');
    },
    selectCurrentRequest: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.clickMouseButton();
    },
    getFontSize: async () => {
      const codeEditor = await this.testSubjects.find('consoleMonacoEditor');
      const editorViewDiv = await codeEditor.findByClassName('view-line');
      return await editorViewDiv.getComputedStyle('font-size');
    },
    pasteClipboardValue: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'v']);
    },
    copyRequestsToClipboard: async () => {
      const textArea = await this.monaco.getTextArea();
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'a']);
      await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'c']);
    },
    isA11yOverlayVisible: async () => {
      return await this.testSubjects.exists('codeEditorAccessibilityOverlay');
    },
  };

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

  public async toggleA11yOverlaySetting() {
    // while the settings form opens/loads this may fail, so retry for a while
    await this.retry.try(async () => {
      const toggle = await this.testSubjects.find('enableA11yOverlay');
      await toggle.click();
    });

    await this.testSubjects.click('settings-save-button');
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
    await textArea.type(letter);
    await this.retry.waitFor('autocomplete to be visible', () => this.isAutocompleteVisible());
  }

  public async isAutocompleteVisible() {
    const element = await this.find.byCssSelector('.ace_autocomplete').catch(() => null);
    if (!element) return false;

    const attribute = await element.getAttribute('style');
    return !attribute?.includes('display: none;');
  }

  public async getAutocompleteSuggestion(index: number = 0) {
    const children1 = await this.find
      .allByCssSelector('.ace_autocomplete .ace_line :nth-child(1)')
      .catch(() => null);
    const children2 = await this.find
      .allByCssSelector('.ace_autocomplete .ace_line :nth-child(2)')
      .catch(() => null);
    if (!children1 || !children2) return null;

    return (await children1[index].getVisibleText()) + (await children2[index].getVisibleText());
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

  public async pressEscape() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(Key.ESCAPE);
  }

  public async pressDown(shift: boolean = false) {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.DOWN] : Key.DOWN);
  }

  public async pressLeft(shift: boolean = false) {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.LEFT] : Key.LEFT);
  }

  public async pressRight(shift: boolean = false) {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.RIGHT] : Key.RIGHT);
  }

  public async pressUp(shift: boolean = false) {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys(shift ? [Key.SHIFT, Key.UP] : Key.UP);
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

  public async getTokenColor(token: string) {
    const element = await this.find.byClassName(token);
    return await element.getComputedStyle('color');
  }

  public async responseHasDeprecationWarning() {
    // Retry for a while to allow the deprecation warning to appear
    return await this.retry.try(async () => {
      const response = await this.getResponse();
      return response.trim().startsWith('#!');
    });
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

  public async collapseJsonBlock(blockNumber: number) {
    const blocks = await this.find.allByCssSelector('.ace_fold-widget');

    if (blocks.length < blockNumber) {
      throw new Error(`No block with index: ${blockNumber}`);
    }

    await blocks[blockNumber].click();
    await this.retry.waitFor('json block to be collapsed', async () => {
      return blocks[blockNumber].getAttribute('class').then((classes) => {
        return classes?.includes('ace_closed') ?? false;
      });
    });
  }

  public async expandJsonBlock(blockNumber: number) {
    const blocks = await this.find.allByCssSelector('.ace_fold-widget');

    if (blocks.length < blockNumber) {
      throw new Error(`No block with index: ${blockNumber}`);
    }

    await blocks[blockNumber].click();
    await this.retry.waitFor('json block to be expanded', async () => {
      return blocks[blockNumber].getAttribute('class').then((classes) => {
        return classes?.includes('ace_open') ?? false;
      });
    });
  }

  public async isJsonBlockExpanded(blockNumber: number) {
    const blocks = await this.find.allByCssSelector('.ace_fold-widget');

    if (blocks.length < blockNumber) {
      throw new Error(`No block with index: ${blockNumber}`);
    }

    const classes = await blocks[blockNumber].getAttribute('class');
    return classes?.includes('ace_open') ?? false;
  }

  public async selectCurrentRequest() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.clickMouseButton();
  }

  public async getRequestAtLine(lineNumber: number) {
    const editor = await this.getEditor();
    const lines = await editor.findAllByClassName('ace_line_group');
    if (lines.length < lineNumber) {
      throw new Error(`No line with index: ${lineNumber}`);
    }

    const line = lines[lineNumber];
    const text = await line.getVisibleText();

    return text.trim();
  }

  public async getCurrentLineNumber() {
    const editor = await this.getRequestEditor();
    let line = await editor.findByCssSelector('.ace_active-line');

    await this.retry.try(async () => {
      const firstInnerHtml = await line.getAttribute('innerHTML');
      // The line number is not updated immediately after the click, so we need to wait for it.
      this.common.sleep(500);
      line = await editor.findByCssSelector('.ace_active-line');
      const secondInnerHtml = await line.getAttribute('innerHTML');
      // The line number will change as the user types, but we want to wait until it's stable.
      return firstInnerHtml === secondInnerHtml;
    });

    // style attribute looks like this: "top: 0px; height: 18.5px;" height is the line height
    const styleAttribute = (await line.getAttribute('style')) ?? '';
    const height = parseFloat(styleAttribute.replace(/.*height: ([+-]?\d+(\.\d+)?).*/, '$1'));
    const top = parseFloat(styleAttribute.replace(/.*top: ([+-]?\d+(\.\d+)?).*/, '$1'));
    // calculate the line number by dividing the top position by the line height
    // and adding 1 because line numbers start at 1
    return Math.ceil(top / height) + 1;
  }

  public async pressCtrlEnter() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.ENTER,
    ]);
  }

  public async pressCtrlI() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'i']);
  }

  public async pressCtrlUp() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], Key.UP]);
  }

  public async pressCtrlDown() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.DOWN,
    ]);
  }

  public async pressCtrlL() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'l']);
  }

  public async pressCtrlSlash() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], '/']);
  }

  public async pressCtrlSpace() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([
      Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'],
      Key.SPACE,
    ]);
  }

  public async clickContextMenu() {
    const contextMenu = await this.testSubjects.find('toggleConsoleMenu');
    await contextMenu.click();
  }

  public async isContextMenuOpen() {
    return await this.testSubjects.exists('consoleMenu');
  }

  public async isCopyAsCurlButtonVisible() {
    return await this.testSubjects.exists('consoleMenuCopyAsCurl');
  }

  public async isOpenDocumentationButtonVisible() {
    return await this.testSubjects.exists('consoleMenuOpenDocs');
  }

  public async isAutoIndentButtonVisible() {
    return await this.testSubjects.exists('consoleMenuAutoIndent');
  }

  public async isA11yOverlayVisible() {
    return await this.testSubjects.exists('a11y-overlay');
  }

  public async clickCopyAsCurlButton() {
    const button = await this.testSubjects.find('consoleMenuCopyAsCurl');
    await button.click();
  }

  public async clickOpenDocumentationButton() {
    const button = await this.testSubjects.find('consoleMenuOpenDocs');
    await button.click();
  }

  public async clickAutoIndentButton() {
    const button = await this.testSubjects.find('consoleMenuAutoIndent');
    await button.click();
  }

  public async getRequestMethod() {
    const requestEditor = await this.getRequestEditor();
    const requestMethod = await requestEditor.findByClassName('ace_method');
    const method = await requestMethod.getVisibleText();
    return method.trim();
  }

  public async getRequestPath() {
    const requestEditor = await this.getRequestEditor();
    const requestPath = await requestEditor.findAllByCssSelector('.ace_url');
    const path = [];
    for (const pathPart of requestPath) {
      const className = await pathPart.getAttribute('class');
      if (className?.includes('ace_param') ?? false) {
        // This is a parameter, we don't want to include it in the path
        break;
      }
      path.push(await pathPart.getVisibleText());
    }
    return path.join('').trim();
  }

  public async getRequestQueryParams() {
    await this.sleepForDebouncePeriod();
    const requestEditor = await this.getRequestEditor();
    const requestQueryParams = await requestEditor.findAllByCssSelector('.ace_url.ace_param');

    if (requestQueryParams.length === 0) {
      // No query params
      return;
    }

    const params = [];
    for (const param of requestQueryParams) {
      params.push(await param.getVisibleText());
    }
    return params.join('').trim();
  }

  public async getRequestBody() {
    let request = await this.getRequest();
    // Remove new lines at the beginning of the request
    request = request.replace(/^\n/, '');
    const method = await this.getRequestMethod();
    const path = await this.getRequestPath();
    const query = await this.getRequestQueryParams();

    if (query) {
      return request.replace(`${method} ${path}?${query}`, '').trim();
    }

    return request.replace(`${method} ${path}`, '').trim();
  }

  public async getRequestLineHighlighting() {
    await this.sleepForDebouncePeriod();
    const requestEditor = await this.getRequestEditor();
    const requestLine = await requestEditor.findAllByCssSelector('.ace_line > *');
    const line = [];
    for (const linePart of requestLine) {
      line.push(await linePart.getAttribute('class'));
    }
    return line.join(' ');
  }

  public async getRequestMethodColor() {
    return await this.getTokenColor('ace_method');
  }

  public async getRequestPathColor() {
    return await this.getTokenColor('ace_url');
  }

  public async getRequestQueryColor() {
    return await this.getTokenColor('ace_param');
  }

  public async getRequestBodyColor() {
    return await this.getTokenColor('ace_paren');
  }

  public async getCommentColor() {
    return await this.getTokenColor('ace_comment');
  }

  public async getRequestBodyCount() {
    const body = await this.getRequestBody();
    return body.split('\n').length;
  }

  public async copyRequestsToClipboard() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'a']);
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'c']);
  }

  public async pasteClipboardValue() {
    const textArea = await this.testSubjects.find('console-textarea');
    await textArea.pressKeys([Key[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'], 'v']);
  }

  public async clickHistory() {
    const historyButton = await this.testSubjects.find('consoleHistoryButton');
    await historyButton.click();
  }

  public async getHistoryEntries() {
    const history = await this.find.allByCssSelector('.list-group-item');
    return await Promise.all(history.map(async (item) => await item.getVisibleText()));
  }

  public async loadRequestFromHistory(index: number) {
    const historyItem = await this.find.byCssSelector(`#historyReq${index}`);
    await historyItem.click();
    await this.testSubjects.click('consoleHistoryApplyButton');
  }

  public async clickClearHistory() {
    const clearHistoryButton = await this.testSubjects.find('consoleClearHistoryButton');
    await clearHistoryButton.click();

    await this.retry.waitFor('history to be cleared', async () => {
      const history = await this.getHistoryEntries();
      return history.length === 0;
    });
  }

  public async closeHistory() {
    const closeButton = await this.testSubjects.find('consoleHistoryCloseButton');
    await closeButton.click();
  }

  public async sleepForDebouncePeriod(milliseconds: number = 100) {
    // start to sleep after confirming JS engine responds
    await this.retry.waitFor('pinging JS engine', () => this.browser.execute('return true;'));
    await this.common.sleep(milliseconds);
  }

  async setAutocompleteTrace(flag: boolean) {
    await this.browser.execute((f: boolean) => {
      (window as any).autocomplete_trace = f;
    }, flag);
  }
}
