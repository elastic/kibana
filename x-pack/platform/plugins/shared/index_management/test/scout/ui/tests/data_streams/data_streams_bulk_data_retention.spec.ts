/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { createDataStream, deleteDataStream } from '../../lib/data_streams';

const TEST_DS_NAMES = ['test-ds-1', 'test-ds-2'];

test.describe('Data streams bulk data retention', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    for (const name of TEST_DS_NAMES) {
      await deleteDataStream(esClient, name);
      await createDataStream(esClient, name);
    }
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test.afterEach(async ({ esClient }) => {
    for (const name of TEST_DS_NAMES) {
      await deleteDataStream(esClient, name);
    }
  });

  test('allows to update data retention in bulk', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.openBulkEditDataRetention(TEST_DS_NAMES);

    // Set the retention to 7 hours
    await page.testSubj.fill('dataRetentionValue', '7');
    await page.testSubj.locator('show-filters-button').click();
    await page.testSubj.locator('filter-option-h').click();

    await page.testSubj.locator('saveButton').click();
    await expect(page.testSubj.locator('globalToastList')).toContainText(
      'Data retention has been updated for 2 data streams.'
    );
  });
});
