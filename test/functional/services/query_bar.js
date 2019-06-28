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

export function QueryBarProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['header', 'common']);
  const find = getService('find');

  class QueryBar {

    async getQueryString() {
      return await testSubjects.getProperty('queryInput', 'value');
    }

    async setQuery(query) {
      log.debug(`QueryBar.setQuery(${query})`);
      // Extra caution used because of flaky test here: https://github.com/elastic/kibana/issues/16978 doesn't seem
      // to be actually setting the query in the query input based off
      await retry.try(async () => {
        await testSubjects.click('queryInput');

        // testSubjects.setValue uses input.clearValue which wasn't working, but input.clearValueWithKeyboard does.
        // So the following lines do the same thing as input.setValue but with input.clearValueWithKeyboard instead.
        const input = await find.activeElement();
        await input.clearValueWithKeyboard();
        await input.type(query);
        const currentQuery = await this.getQueryString();
        if (currentQuery !== query) {
          throw new Error(`Failed to set query input to ${query}, instead query is ${currentQuery}`);
        }
      });
    }

    async submitQuery() {
      log.debug('QueryBar.submitQuery');
      await testSubjects.click('queryInput');
      await PageObjects.common.pressEnterKey();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickQuerySubmitButton() {
      await testSubjects.click('querySubmitButton');
    }

  }

  return new QueryBar();
}
