/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
