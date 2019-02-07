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

import expect from 'expect.js';

const TEST_DISCOVER_START_TIME = '2015-09-19 06:31:44.000';
const TEST_DISCOVER_END_TIME = '2015-09-23 18:31:44.000';
const TEST_COLUMN_NAMES = ['@message'];
const TEST_FILTER_COLUMN_NAMES = [['extension', 'jpg'], ['geo.src', 'IN']];

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('context link in discover', function contextSize() {
    before(async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(TEST_DISCOVER_START_TIME, TEST_DISCOVER_END_TIME);
      await Promise.all(TEST_COLUMN_NAMES.map((columnName) => (
        PageObjects.discover.clickFieldListItemAdd(columnName)
      )));
      await Promise.all(TEST_FILTER_COLUMN_NAMES.map(async ([columnName, value]) => {
        await PageObjects.discover.clickFieldListItem(columnName);
        await PageObjects.discover.clickFieldListPlusFilter(columnName, value);
      }));
    });

    it('should open the context view with the selected document as anchor', async function () {
      const discoverDocTable = await docTable.getTable();
      const firstRow = (await docTable.getBodyRows(discoverDocTable))[0];

      // get the timestamp of the first row
      const firstTimestamp = await (await docTable.getFields(firstRow))[0]
        .getVisibleText();

      // navigate to the context view
      await (await docTable.getRowExpandToggle(firstRow)).click();
      const firstDetailsRow = (await docTable.getDetailsRows(discoverDocTable))[0];
      await (await docTable.getRowActions(firstDetailsRow))[0].click();

      // check the anchor timestamp in the context view
      await retry.try(async () => {
        const contextDocTable = await docTable.getTable();
        const anchorRow = await docTable.getAnchorRow(contextDocTable);
        const anchorTimestamp = await (await docTable.getFields(anchorRow))[0]
          .getVisibleText();
        expect(anchorTimestamp).to.equal(firstTimestamp);
      });
    });

    it('should open the context view with the same columns', async function () {
      const table = await docTable.getTable();
      await retry.try(async () => {
        const headerFields = await docTable.getHeaderFields(table);
        const columnNames = await Promise.all(headerFields.map((headerField) => (
          headerField.getVisibleText()
        )));
        expect(columnNames).to.eql([
          'Time',
          ...TEST_COLUMN_NAMES,
        ]);
      });
    });

    it('should open the context view with the filters disabled', async function () {
      const hasDisabledFilters = (
        await Promise.all(TEST_FILTER_COLUMN_NAMES.map(
          ([columnName, value]) => filterBar.hasFilter(columnName, value, false)
        ))
      ).reduce((result, hasDisabledFilter) => result && hasDisabledFilter, true);

      expect(hasDisabledFilters).to.be(true);
    });
  });

}
