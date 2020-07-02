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

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('context link in discover', () => {
    before(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');

      for (const columnName of TEST_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItemAdd(columnName);
      }

      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }
    });
    after(async () => {
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    it('should open the context view with the selected document as anchor', async () => {
      // check the anchor timestamp in the context view
      await retry.waitFor('selected document timestamp matches anchor timestamp ', async () => {
        // get the timestamp of the first row
        const discoverFields = await docTable.getFields();
        const firstTimestamp = discoverFields[0][0];

        // navigate to the context view
        await docTable.clickRowToggle({ rowIndex: 0 });
        const rowActions = await docTable.getRowActions({ rowIndex: 0 });
        await rowActions[0].click();
        const contextFields = await docTable.getFields({ isAnchorRow: true });
        const anchorTimestamp = contextFields[0][0];
        return anchorTimestamp === firstTimestamp;
      });
    });

    it('should open the context view with the same columns', async () => {
      const columnNames = await docTable.getHeaderFields();
      expect(columnNames).to.eql(['Time', ...TEST_COLUMN_NAMES]);
    });

    it('should open the context view with the filters disabled', async () => {
      let disabledFilterCounter = 0;
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        if (await filterBar.hasFilter(columnName, value, false)) {
          disabledFilterCounter++;
        }
      }
      expect(disabledFilterCounter).to.be(TEST_FILTER_COLUMN_NAMES.length);
    });
  });
}
