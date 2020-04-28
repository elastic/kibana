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
];

export default function({ getService, getPageObjects }) {
  const retry = getService('retry');
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  // FLAKY: https://github.com/elastic/kibana/issues/53308
  describe.skip('context link in discover', function contextSize() {
    before(async function() {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await Promise.all(
        TEST_COLUMN_NAMES.map(columnName => PageObjects.discover.clickFieldListItemAdd(columnName))
      );
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });

    it('should open the context view with the selected document as anchor', async function() {
      // get the timestamp of the first row
      const firstTimestamp = (await docTable.getFields())[0][0];

      // navigate to the context view
      await docTable.clickRowToggle({ rowIndex: 0 });
      await (await docTable.getRowActions({ rowIndex: 0 }))[0].click();

      // check the anchor timestamp in the context view
      await retry.try(async () => {
        const anchorTimestamp = (await docTable.getFields({ isAnchorRow: true }))[0][0];
        expect(anchorTimestamp).to.equal(firstTimestamp);
      });
    });

    it('should open the context view with the same columns', async function() {
      const columnNames = await docTable.getHeaderFields();
      expect(columnNames).to.eql(['Time', ...TEST_COLUMN_NAMES]);
    });

    it('should open the context view with the filters disabled', async function() {
      const hasDisabledFilters = (
        await Promise.all(
          TEST_FILTER_COLUMN_NAMES.map(([columnName, value]) =>
            filterBar.hasFilter(columnName, value, false)
          )
        )
      ).reduce((result, hasDisabledFilter) => result && hasDisabledFilter, true);

      expect(hasDisabledFilters).to.be(true);
    });
  });
}
