import Bluebird from 'bluebird';

import PageObjects from './';
import {
  defaultFindTimeout,
} from '../';

async function getVisibleTextFromAceEditor(editor) {
  const lines = await editor.findAllByClassName('ace_line_group');
  const linesText = await Bluebird.map(lines, l => l.getVisibleText());
  return linesText.join('\n');
}

export default class ConsolePage {
  init(remote) {
    this.remote = remote;
  }

  async getRequestEditor() {
    return await PageObjects.common.findTestSubject('console request-editor');
  }

  async getRequest() {
    const requestEditor = await this.getRequestEditor();
    return await getVisibleTextFromAceEditor(requestEditor);
  }

  async getResponse() {
    const responseEditor = await PageObjects.common.findTestSubject('console response-editor');
    return await getVisibleTextFromAceEditor(responseEditor);
  }

  async clickPlay() {
    const sendRequestButton = await PageObjects.common.findTestSubject('console send-request-button');
    await sendRequestButton.click();
  }

  async collapseHelp() {
    const closeButton = await PageObjects.common.findTestSubject('console help-close-button');
    await closeButton.click();
  }

  async openSettings() {
    const settingsButton = await PageObjects.common.findTestSubject('console top-nav menu-item-settings');
    await settingsButton.click();
  }

  async setFontSizeSetting(newSize) {
    await this.openSettings();

    // while the settings form opens/loads this may fail, so retry for a while
    await PageObjects.common.try(async () => {
      const fontSizeInput = await PageObjects.common.findTestSubject('console setting-font-size-input');
      await fontSizeInput.clearValue();
      await fontSizeInput.click();
      await fontSizeInput.type(String(newSize));
    });

    const saveButton = await PageObjects.common.findTestSubject('console settings-save-button');
    await saveButton.click();
  }

  async getFontSize(editor) {
    const aceLine = await editor.findByClassName('ace_line');
    return await aceLine.getComputedStyle('font-size');
  }

  async getRequestFontSize() {
    return await this.getFontSize(await this.getRequestEditor());
  }
}
