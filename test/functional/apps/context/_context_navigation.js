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

import expect from '@kbn/expect';

const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES = [
  ['extension', 'jpg'],
  ['geo.src', 'IN'],
  [
    'agent',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
  ],
];

export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'context', 'discover', 'timePicker']);

  // FLAKY: https://github.com/elastic/kibana/issues/62866
  describe.skip('context link in discover', function contextSize() {
    before(async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await Promise.all(
        TEST_COLUMN_NAMES.map((columnName) =>
          PageObjects.discover.clickFieldListItemAdd(columnName)
        )
      );
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });

    it('should go back after loading', async function () {
      // navigate to the context view
      await docTable.clickRowToggle({ rowIndex: 0 });
      await (await docTable.getRowActions({ rowIndex: 0 }))[0].click();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      await PageObjects.context.clickSuccessorLoadMoreButton();
      await PageObjects.context.clickSuccessorLoadMoreButton();
      await PageObjects.context.clickSuccessorLoadMoreButton();
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      await browser.goBack();
      await PageObjects.discover.waitForDocTableLoadingComplete();
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be('522');
    });
  });
}
