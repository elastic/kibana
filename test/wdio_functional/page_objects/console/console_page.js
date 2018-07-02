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
import expect from 'expect';
import { testSubjectifySelector } from '../../helpers/helpers';
import BasePage from '../common/base_page';

export default class ConsolePage extends BasePage {

  constructor(driver) {
    super(driver);
    this.breadCrumbSelector = 'div.kuiLocalBreadcrumb';
    this.requestEditorSelector = testSubjectifySelector(
      'request-editor',
      'css'
    );
    this.editorContentSelector = 'div.ace_scroller > div.ace_content';
    this.requestEditorTextSelector =
      this.requestEditorSelector + ' > ' + this.editorContentSelector;
    this.playButtonSelector = testSubjectifySelector(
      'send-request-button',
      'css'
    );
    this.responseEditorSelector = '#output';
    this.responseEditorTextSelector =
      this.responseEditorSelector + ' > ' + this.editorContentSelector;
    this.consoleSettingsButtonSelector =
      '//button' + testSubjectifySelector('consoleSettingsButton', 'xpath');
    this.fontSizeInputSelector = testSubjectifySelector(
      'setting-font-size-input',
      'css'
    );
    this.saveSettingsButton = testSubjectifySelector(
      'settings-save-button',
      'css'
    );
    this.DEFAULT_REQUEST = `
    
GET _search
{
  "query": {
    "match_all": {}
  }
}

`;
    this.init();
  }

  changeFontSize(size) {
    this.openSettings();
    this.type(this.fontSizeInputSelector, String(size), true);
    this.click(this.saveSettingsButton);

    this.driver.waitUntil(() => {
      const fontValues = this.getCssPropertyValue(
        this.requestEditorTextSelector +
        ':nth-child(1)  .ace_line:nth-child(1)',
        'font-size'
      );
      const fontSize = Array.isArray(fontValues)
        ? fontValues.pop().value
        : fontValues.value;
      return fontSize.replace('px', '') === `${String(size)}`;
    });
  }

  openSettings() {
    this.driver.waitUntil(() => {
      this.click(this.consoleSettingsButtonSelector);
      return this.driver.isVisible(this.fontSizeInputSelector);
    });
  }

  get request() {
    return this.getElementText(this.requestEditorTextSelector);
  }

  // TODO: Add set request
  // public set request(requestString) { }

  get response() {
    this.driver.waitUntil(() => {
      return (
        this.getElementText(this.responseEditorTextSelector)
          .replace('{', '')
          .replace('}', '') !== ''
      );
    });
    return this.getElementText(this.responseEditorTextSelector);
  }

  get requestFontSize() {
    const cssValues = this.getCssPropertyValue(
      this.requestEditorTextSelector + ':nth-child(1)  .ace_line:nth-child(1)',
      'font-size'
    );
    const value = Array.isArray(cssValues)
      ? cssValues.pop().value
      : cssValues.value;
    return value;
  }

  clickPlay() {
    this.click(this.playButtonSelector);
  }

  init() {
    // logger.debug('Wait for Dev Tools Breadcrumb to exist. ');
    this.driver.waitForExist(this.breadCrumbSelector);
    expect('Dev Tools').toBe(this.getElementText(this.breadCrumbSelector));
    // logger.debug('Waiting for title to be Console - Kibana');
    this.driver.waitUntil(() => {
      return this.title === 'Console - Kibana';
    });
  }

  // TODO: Submit Request Implementation
  // submitRequest(requestText) {
  //   this.clickPlay();
  // }
}
