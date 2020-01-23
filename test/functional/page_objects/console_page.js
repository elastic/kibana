/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Bluebird from 'bluebird';

export function ConsolePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  async function getVisibleTextFromAceEditor(editor) {
    const lines = await editor.findAllByClassName('ace_line_group');
    const linesText = await Bluebird.map(lines, l => l.getVisibleText());
    return linesText.join('\n');
  }

  return new (class ConsolePage {
    async getRequestEditor() {
      return await testSubjects.find('request-editor');
    }

    async getRequest() {
      const requestEditor = await this.getRequestEditor();
      return await getVisibleTextFromAceEditor(requestEditor);
    }

    async getResponse() {
      const responseEditor = await testSubjects.find('response-editor');
      return await getVisibleTextFromAceEditor(responseEditor);
    }

    async clickPlay() {
      await testSubjects.click('sendRequestButton');
    }

    async collapseHelp() {
      await testSubjects.click('help-close-button');
    }

    async openSettings() {
      await testSubjects.click('consoleSettingsButton');
    }

    async setFontSizeSetting(newSize) {
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

    async getFontSize(editor) {
      const aceLine = await editor.findByClassName('ace_line');
      return await aceLine.getComputedStyle('font-size');
    }

    async getRequestFontSize() {
      return await this.getFontSize(await this.getRequestEditor());
    }
  })();
}
