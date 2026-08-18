/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { createDataStream, deleteDataStream } from '../../lib/data_streams';
import { SERVERLESS_ONLY } from '../../tags';

const TEST_DS_NAME = 'test-ds-1';

// Serverless only: without ILM the flyout renders the phase selector with no hot or frozen phase
// card, and offers no lifecycle method choice.
test.describe('Data streams lifecycle on serverless', { tag: SERVERLESS_ONLY }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
    await createDataStream(esClient, TEST_DS_NAME);
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
  });

  test.afterEach(async ({ esClient }) => {
    await deleteDataStream(esClient, TEST_DS_NAME);
  });

  test('offers only the delete phase, with no ILM lifecycle method', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME);
    await page.testSubj.locator('flyoutTab-successful_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();

    // The lifecycle method picker is omitted entirely, so neither method card renders.
    await expect(page.testSubj.locator('editDataLifecycle-methodCard-ilm')).toBeHidden();
    await expect(page.testSubj.locator('editDataLifecycle-methodCard-dlm')).toBeHidden();

    await expect(page.testSubj.locator('dlmPhasesSelectorDeletePhaseCard')).toBeVisible();
    await expect(page.testSubj.locator('dlmPhasesSelectorHotPhaseCard')).toBeHidden();
    await expect(page.testSubj.locator('dlmPhasesSelectorFrozenPhaseCard')).toBeHidden();
  });
});
