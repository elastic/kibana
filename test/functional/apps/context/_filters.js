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

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

export default function ({ getService, getPageObjects }) {
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const retry = getService('retry');

  const PageObjects = getPageObjects(['common', 'context']);

  describe('context filters', function contextSize() {
    beforeEach(async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    it('should be addable via expanded doc table rows', async function () {
      await docTable.toggleRowExpanded({ isAnchorRow: true });

      await retry.try(async () => {
        const anchorDetailsRow = await docTable.getAnchorDetailsRow();
        await docTable.addInclusiveFilter(anchorDetailsRow, TEST_ANCHOR_FILTER_FIELD);
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        // await docTable.toggleRowExpanded({ isAnchorRow: true });
        expect(
          await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, true)
        ).to.be(true);
        const fields = await docTable.getFields();
        const hasOnlyFilteredRows = fields
          .map(row => row[2])
          .every(fieldContent => fieldContent === TEST_ANCHOR_FILTER_VALUE);
        expect(hasOnlyFilteredRows).to.be(true);
      });
    });

    it('should be toggleable via the filter bar', async function () {
      await filterBar.addFilter(TEST_ANCHOR_FILTER_FIELD, 'IS', TEST_ANCHOR_FILTER_VALUE);
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      // disable filter
      await filterBar.toggleFilterEnabled(TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      retry.try(async () => {
        expect(
          await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, false)
        ).to.be(true);
        const fields = await docTable.getFields();
        const hasOnlyFilteredRows = fields
          .map(row => row[2])
          .every(fieldContent => fieldContent === TEST_ANCHOR_FILTER_VALUE);
        expect(hasOnlyFilteredRows).to.be(false);
      });
    });
  });
}
