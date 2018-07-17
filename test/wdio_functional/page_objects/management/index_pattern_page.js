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
import { testSubjectifySelector } from '../../helpers/helpers';

export default class IndexPatternPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.driver = driver;
    this.createIndexPatternHeaderLocator = 'h1.euiTitle';
    this.createIndexPatternNameInputLocator = testSubjectifySelector('createIndexPatternNameInput', 'css');
    this.createIndexPatternStep2ButtonLocator = testSubjectifySelector('createIndexPatternGoToStep2Button', 'css');
    this.createIndexPatternCreateButtonLocator = testSubjectifySelector('createIndexPatternCreateButton', 'css');
    this.createIndexPatternTimeFieldSelectLocator = testSubjectifySelector('createIndexPatternTimeFieldSelect', 'css');
    this.indexPatternsLinksLocator = testSubjectifySelector('indexPatternLink', 'css');
    this.indexPatternTitleLocator = testSubjectifySelector('indexPatternTitle', 'css');
    this.init();
  }
  init() {
    expect('Create index pattern').toBe(this.getElementText(this.createIndexPatternHeaderLocator));
    this.driver.waitUntil(() => {
      return this.title === 'Kibana';
    });
    expect(this.isEnabled(this.createIndexPatternStep2ButtonLocator)).toBe(false);
  }

  /**
    * @function createIndexPattern
    * @param {string}  [name="logstash"] name of index pattern being created
    * @param {boolean} [useTimeStamp=true] whether to filter on timestamps in step 2
  */
  createIndexPattern(name = 'logstash', useTimeStamp = true) {
    this.type(this.createIndexPatternNameInputLocator, name, true);

    this.logger.debug('Waiting until Step 2 Button enabled.');
    this.driver.waitForEnabled(this.createIndexPatternStep2ButtonLocator);

    expect(this.isEnabled(this.createIndexPatternStep2ButtonLocator)).toBe(true);
    this.click(this.createIndexPatternStep2ButtonLocator);

    this.driver.waitForVisible(this.createIndexPatternCreateButtonLocator);
    this.driver.waitForVisible(this.createIndexPatternTimeFieldSelectLocator);

    let selectText;
    if (useTimeStamp) {
      selectText = '@timestamp';
    } else {
      selectText = 'I don\'t want to use the Time Filter';
    }
    this.driver.selectByVisibleText(this.createIndexPatternTimeFieldSelectLocator, selectText);
    this.driver.waitForEnabled(this.createIndexPatternCreateButtonLocator);

    this.click(this.createIndexPatternCreateButtonLocator);

    this.driver.waitForVisible(this.indexPatternTitleLocator);
    expect(this.getElementText(this.indexPatternTitleLocator)).toBe(`${name}*`);
  }

  /**
    * @function indexPatterns  {getter}
    * @returns [string] Names of all of the existing indexPatterns
  */
  get indexPatterns() {
    let indexPatterns = this.findElements(this.indexPatternsLinksLocator);
    if (!Array.isArray(indexPatterns)) {
      indexPatterns = [indexPatterns];

    }
    const indexPatternNames = [];
    for (let i = 0; i < indexPatterns.length; i++) {
      console.log(indexPatterns[i].getText());
      indexPatternNames.push(indexPatterns[i].getText());
    }
    return indexPatternNames;
  }
}