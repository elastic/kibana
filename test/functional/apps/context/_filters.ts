/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const PageObjects = getPageObjects(['common', 'context']);

  describe('context filters', function contextSize() {
    before(async function () {
      await kibanaServer.uiSettings.update({ 'doc_table:legacy': false });
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    it('inclusive filter should be addable via expanded data grid rows', async function () {
      await retry.waitFor(`filter ${TEST_ANCHOR_FILTER_FIELD} in filterbar`, async () => {
        await dataGrid.clickRowToggle({ isAnchorRow: true, renderMoreRows: true });
        await testSubjects.click(`openFieldActionsButton-${TEST_ANCHOR_FILTER_FIELD}`);
        await testSubjects.click(`addFilterForValueButton-${TEST_ANCHOR_FILTER_FIELD}`);
        await PageObjects.context.waitUntilContextLoadingHasFinished();

        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, true);
      });
      await retry.waitFor(`filter matching docs in data grid`, async () => {
        const fields = await dataGrid.getFields();
        return fields
          .map((row) => row[2])
          .every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
      });
    });

    it('inclusive filter should be toggleable via the filter bar', async function () {
      await filterBar.addFilter(TEST_ANCHOR_FILTER_FIELD, 'IS', TEST_ANCHOR_FILTER_VALUE);
      await PageObjects.context.waitUntilContextLoadingHasFinished();
      // disable filter
      await filterBar.toggleFilterEnabled(TEST_ANCHOR_FILTER_FIELD);
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await retry.waitFor(`a disabled filter in filterbar`, async () => {
        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, TEST_ANCHOR_FILTER_VALUE, false);
      });

      await retry.waitFor('filters are disabled', async () => {
        const fields = await dataGrid.getFields();
        const hasOnlyFilteredRows = fields
          .map((row) => row[2])
          .every((fieldContent) => fieldContent === TEST_ANCHOR_FILTER_VALUE);
        return hasOnlyFilteredRows === false;
      });
    });

    it('filter for presence should be addable via expanded data grid rows', async function () {
      await retry.waitFor('an exists filter in the filterbar', async () => {
        await dataGrid.clickRowToggle({ isAnchorRow: true, renderMoreRows: true });
        await testSubjects.click(`openFieldActionsButton-${TEST_ANCHOR_FILTER_FIELD}`);
        await testSubjects.click(`addExistsFilterButton-${TEST_ANCHOR_FILTER_FIELD}`);
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        return await filterBar.hasFilter(TEST_ANCHOR_FILTER_FIELD, 'exists', true);
      });
    });
  });
}
