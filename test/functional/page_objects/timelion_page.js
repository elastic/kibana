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

export function TimelionPageProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const remote = getService('remote');

  class TimelionPage {
    async initTests() {
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });

      log.debug('load kibana index');
      await esArchiver.load('timelion');

      await PageObjects.common.navigateToApp('timelion');
    }

    async setExpression(expression, caretPosition) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      await input.clearValue();
      await input.type(expression);
      await this._positionCaret(caretPosition);
    }

    async getExpression() {
      const input = await testSubjects.find('timelionExpressionTextArea');
      return input.getVisibleText();
    }

    async getSuggestionItemsText() {
      await this._waitForSuggestionListLoading();
      const elements = await find.allByCssSelector('.suggestions .suggestion');
      return await Promise.all(elements.map(async element => await element.getVisibleText()));
    }

    async _positionCaret(caretPosition) {
      const input = await testSubjects.find('timelionExpressionTextArea');
      const inputText = await input.getProperty('value');
      await input.click(); // places caret at end of input
      const clickPromises = [];
      for (let i = inputText.length; i > caretPosition; i--) {
        // move caret to left
        clickPromises.push(remote.pressKeys('\uE012'));
      }
      await Promise.all(clickPromises);
    }

    async _waitForSuggestionListLoading() {
      const suggestionList = await testSubjects.find('timelionSuggestionList');
      const isLoading = await this._isLoading(suggestionList);
      if (isLoading) {
        await retry.try(async () => {
          await suggestionList.waitForDeletedByClassName('euiLoadingSpinner');
        });
      }
    }

    async _isLoading(suggestionListElement) {
      return await find.exists(
        async () => await suggestionListElement.findByCssSelector('.euiLoadingSpinner'));
    }
  }

  return new TimelionPage();
}
