import expect from 'expect.js';

const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_ANCHOR_TYPE = 'apache';
const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];
const TEST_INDEX_PATTERN = 'logstash-*';

export default function ({ getService, getPageObjects }) {
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'context']);

  describe('context filters', function contextSize() {
    before(async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    it('should be addable via expanded doc table rows', async function () {
      const table = await docTable.getTable();
      const anchorRow = await docTable.getAnchorRow(table);

      await docTable.toggleRowExpanded(anchorRow);

      const anchorDetailsRow = await docTable.getAnchorDetailsRow(table);
      await docTable.addInclusiveFilter(anchorDetailsRow, TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await docTable.toggleRowExpanded(anchorRow);

      expect(await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, true)).to.be(true);

      const rows = await docTable.getBodyRows(table);
      const hasOnlyFilteredRows = (
        await Promise.all(rows.map(
          async (row) => await (await docTable.getFields(row))[2].getVisibleText()
        ))
      ).every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
      expect(hasOnlyFilteredRows).to.be(true);
    });

    it('should be toggleable via the filter bar', async function () {
      const table = await docTable.getTable();

      await filterBar.toggleFilterEnabled(TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      expect(await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, false)).to.be(true);

      const rows = await docTable.getBodyRows(table);
      const hasOnlyFilteredRows = (
        await Promise.all(rows.map(
          async (row) => await (await docTable.getFields(row))[2].getVisibleText()
        ))
      ).every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
      expect(hasOnlyFilteredRows).to.be(false);
    });
  });
}
