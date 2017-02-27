import expect from 'expect.js';

import { bdd, esClient } from '../../../support';
import PageObjects from '../../../support/page_objects';


const TEST_DISCOVER_START_TIME = '2015-09-19 06:31:44.000';
const TEST_DISCOVER_END_TIME = '2015-09-23 18:31:44.000';
const TEST_COLUMN_NAMES = ['@message'];

bdd.describe('context link in discover', function contextSize() {
  bdd.before(async function() {
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.header.setAbsoluteRange(TEST_DISCOVER_START_TIME, TEST_DISCOVER_END_TIME);
    await Promise.all(TEST_COLUMN_NAMES.map((columnName) => (
      PageObjects.discover.clickFieldListItemAdd(columnName)
    )));
  });

  bdd.it('should open the context view with the selected document as anchor', async function () {
    const discoverDocTable = await PageObjects.docTable.getTable();
    const firstRow = (await PageObjects.docTable.getBodyRows(discoverDocTable))[0];
    const firstTimestamp = await (await PageObjects.docTable.getFields(firstRow))[0]
      .getVisibleText();

    // add a column in Discover
    await (await PageObjects.docTable.getRowExpandToggle(firstRow)).click();
    const firstDetailsRow = (await PageObjects.docTable.getDetailsRows(discoverDocTable))[0];
    await (await PageObjects.docTable.getRowActions(firstDetailsRow))[0].click();

    // check the column in the Context View
    await PageObjects.common.try(async () => {
      const contextDocTable = await PageObjects.docTable.getTable();
      const anchorRow = await PageObjects.docTable.getAnchorRow(contextDocTable);
      const anchorTimestamp = await (await PageObjects.docTable.getFields(anchorRow))[0]
        .getVisibleText();
      expect(anchorTimestamp).to.equal(firstTimestamp);
    });
  });

  bdd.it('should open the context view with the same columns', async function () {
    const docTable = await PageObjects.docTable.getTable();
    await PageObjects.common.try(async () => {
      const headerFields = await PageObjects.docTable.getHeaderFields(docTable);
      const columnNames = await Promise.all(headerFields.map((headerField) => (
        headerField.getVisibleText()
      )));
      expect(columnNames).to.eql([
        'Time',
        ...TEST_COLUMN_NAMES,
      ]);
    });
  });
});
