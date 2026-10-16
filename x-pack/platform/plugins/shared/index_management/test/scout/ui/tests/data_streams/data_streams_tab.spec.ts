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

const TEST_DS_NAME = 'test-ds-1';

test.describe('Data streams tab', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
    await createDataStream(esClient, TEST_DS_NAME);
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test.afterEach(async ({ esClient }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
  });

  test('shows the details flyout when clicking on a data stream', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);

    await expect(page).toHaveURL(new RegExp(`/data_streams/${TEST_DS_NAME}`));
    await expect(page.testSubj.locator('dataStreamDetailPanel')).toBeVisible();
  });

  test('allows to update data retention from the details panel', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME);
    await page.testSubj.locator('flyoutTab-successful_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();

    // Stopping the inheritance leaves the delete phase off, so enable it to set a retention period.
    await page.testSubj.locator('dlmPhasesSelectorDeletePhaseCard').click();
    await page.testSubj.fill('deleteDurationValue', '7');

    await pageObjects.indexManagement.applyDataStreamLifecycleChange();

    // Applying closes the details panel and reloads the list; reopen to verify the summary.
    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
    await expect(page.testSubj.locator('successfulIngestLifecycleDetail')).toContainText('7 days');
  });
});
