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

const FAILURE_STORE_CHECKBOX = 'editFailedDataLifecycle-enableFailureStoreCheckbox';

test.describe('Data streams failure store', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
    await createDataStream(esClient, TEST_DS_NAME);
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test.afterEach(async ({ esClient }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
  });

  test('allows to enable failure store from the details panel', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME);
    await page.testSubj.locator('flyoutTab-failed_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();

    await page.testSubj.locator(FAILURE_STORE_CHECKBOX).check();
    await pageObjects.indexManagement.applyDataStreamLifecycleChange();

    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
    // An enabled failure store is managed by the data stream lifecycle (not "Disabled").
    await expect(page.testSubj.locator('failedIngestLifecycleDetail')).toContainText(
      'Data stream lifecycle'
    );
  });

  test('allows to disable failure store from the details panel', async ({ page, pageObjects }) => {
    // Enable it first so disabling is a real change.
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME);
    await page.testSubj.locator('flyoutTab-failed_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();
    const failureStore = page.testSubj.locator(FAILURE_STORE_CHECKBOX);
    await failureStore.check();
    await pageObjects.indexManagement.applyDataStreamLifecycleChange();

    // Now disable it.
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME);
    await page.testSubj.locator('flyoutTab-failed_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();
    await failureStore.uncheck();
    await pageObjects.indexManagement.applyDataStreamLifecycleChange();

    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME);
    await expect(page.testSubj.locator('failedIngestLifecycleDetail')).toContainText('Disabled');
  });
});
