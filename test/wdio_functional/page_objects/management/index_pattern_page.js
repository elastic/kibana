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

import BasePage from '../common/base_page';
import { createTestSubjectSelectorCss } from '../../helpers/helpers';

export default class IndexPatternPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.driver = driver;
    this.createIndexPatternHeaderSelector = 'h1.euiTitle';
    this.createIndexPatternNameInputSelector = createTestSubjectSelectorCss('createIndexPatternNameInput');
    this.createIndexPatternStep2ButtonSelector = createTestSubjectSelectorCss('createIndexPatternGoToStep2Button');
    this.createIndexPatternCreateButtonSelector = createTestSubjectSelectorCss('createIndexPatternCreateButton');
    this.createIndexPatternTimeFieldSelectSelector = createTestSubjectSelectorCss('createIndexPatternTimeFieldSelect');
    this.indexPatternsLinksSelector = createTestSubjectSelectorCss('indexPatternLink');
    this.indexPatternTitleSelector = createTestSubjectSelectorCss('indexPatternTitle');
    this.init();
  }
  init() {
    expect('Create index pattern').toBe(this.getElementText(this.createIndexPatternHeaderSelector));
    this.driver.waitUntil(() => {
      return this.title === 'Kibana';
    });
    this.logger.debug('Step 2 button should not be enabled.');
    expect(this.isEnabled(this.createIndexPatternStep2ButtonSelector)).toBe(false);
  }

  /**
    * @function createIndexPattern
    * @param {string}  [name="logstash"] name of index pattern being created
    * @param {boolean} [useTimeStamp=true] whether to filter on timestamps in step 2
  */
  createIndexPattern(name = 'logstash', useTimeStamp = true) {
    this.logger.debug(`Creating index pattern with the name ${name}`);
    this.type(this.createIndexPatternNameInputSelector, name, true);

    this.logger.debug('Waiting until Step 2 Button enabled.');
    this.driver.waitForEnabled(this.createIndexPatternStep2ButtonSelector);

    expect(this.isEnabled(this.createIndexPatternStep2ButtonSelector)).toBe(true);
    this.click(this.createIndexPatternStep2ButtonSelector);

    this.driver.waitForVisible(this.createIndexPatternCreateButtonSelector);
    this.driver.waitForVisible(this.createIndexPatternTimeFieldSelectSelector);

    //TODO: Add data test subject for the selector for the timestamp select.
    this.logger.debug(`Use timestamp is set to ${useTimeStamp}`);
    let selectText;
    if (useTimeStamp) {
      selectText = '@timestamp';
    } else {
      selectText = 'I don\'t want to use the Time Filter';
    }
    this.driver.selectByVisibleText(this.createIndexPatternTimeFieldSelectSelector, selectText);

    this.logger.debug('Waiting for create button to become enabled.');
    this.driver.waitForEnabled(this.createIndexPatternCreateButtonSelector);

    this.click(this.createIndexPatternCreateButtonSelector);

    this.logger.debug(`Waiting until title is for index pattern is ${name}`);
    this.driver.waitForVisible(this.indexPatternTitleSelector);
    expect(this.getElementText(this.indexPatternTitleSelector)).toBe(`${name}*`);
  }

  /**
    * @function indexPatterns  {getter}
    * @returns [string] Names of all of the existing indexPatterns
  */
  get indexPatterns() {
    this.logger.debug('Getting all index patterns.');
    let indexPatterns = this.findElements(this.indexPatternsLinksSelector);
    if (!Array.isArray(indexPatterns)) {
      indexPatterns = [indexPatterns];

    }
    const indexPatternNames = [];
    for (let i = 0; i < indexPatterns.length; i++) {
      const indexPatternName = indexPatterns[i].getText();
      this.logger.debug(`Found index pattern with the name ${indexPatternName}`);
      indexPatternNames.push(indexPatternName);
    }
    return indexPatternNames;
  }
}