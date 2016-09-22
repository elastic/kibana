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
  init() {

  }

  async getRequest() {
    const requestEditor = await PageObjects.common.findTestSubject('console request-editor');
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
}
