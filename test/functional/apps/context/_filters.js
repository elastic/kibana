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

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_TYPE = 'doc';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

export default function ({ getService, getPageObjects }) {
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'context']);

  describe('context filters', function contextSize() {
    beforeEach(async function () {
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
      await filterBar.addFilter(TEST_ANCHOR_FILTER_FIELD, 'IS', TEST_ANCHOR_FILTER_VALUE);
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
