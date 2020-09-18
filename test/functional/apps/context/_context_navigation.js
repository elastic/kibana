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

const TEST_FILTER_COLUMN_NAMES = [
  [
    'agent',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
  ],
  ['extension', 'jpg'],
];

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const browser = getService('browser');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'context', 'discover', 'timePicker']);

  describe('discover - context - back navigation', function contextSize() {
    before(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });

    it('should go back after loading', async function () {
      await retry.waitFor('user navigating to context and returning to discover', async () => {
        // navigate to the context view
        const initialHitCount = await PageObjects.discover.getHitCount();
        await docTable.clickRowToggle({ rowIndex: 0 });
        const rowActions = await docTable.getRowActions({ rowIndex: 0 });
        await rowActions[0].click();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await browser.goBack();
        await PageObjects.discover.waitForDocTableLoadingComplete();
        const hitCount = await PageObjects.discover.getHitCount();
        return initialHitCount === hitCount;
      });
    });
  });
}
