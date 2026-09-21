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
const [TEST_DS_NAME_1] = TEST_DS_NAMES;

const DELETE_PHASE_CARD = 'dlmPhasesSelectorDeletePhaseCard';

// Stateful only: serverless enforces a maximum retention period and hides the toggle that turns
// retention off.
test.describe('Data streams lifecycle editing', { tag: tags.stateful.classic }, () => {
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

  test('allows to keep data indefinitely from the details panel', async ({ page, pageObjects }) => {
    // Start from an explicit retention so turning the delete phase off is a real change.
    await pageObjects.indexManagement.openDataStreamLifecycleFlyout(TEST_DS_NAME_1);
    await page.testSubj.locator('flyoutTab-successful_data').click();
    await pageObjects.indexManagement.stopInheritingDataStreamLifecycle();
    // Stopping the inheritance leaves the delete phase off, so enable it to set a retention period.
    await page.testSubj.locator(DELETE_PHASE_CARD).click();
    await page.testSubj.fill('deleteDurationValue', '7');
    // Turn the delete phase off again to keep data indefinitely.
    await page.testSubj.locator(DELETE_PHASE_CARD).click();
    await pageObjects.indexManagement.applyDataStreamLifecycleChange();

    await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
    // Infinite retention is rendered as the infinity symbol.
    await expect(page.testSubj.locator('successfulIngestLifecycleDetail')).toContainText('∞');
  });

  test('allows to disable data retention in bulk', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.openBulkEditDataRetention(TEST_DS_NAMES);

    // Disable retention (the field is an EuiSwitch, so toggle it by its switch role).
    await page.getByRole('switch', { name: 'Enable data retention' }).click();

    await page.testSubj.locator('saveButton').click();
    await expect(page.testSubj.locator('globalToastList')).toContainText(
      'Data retention has been updated for 2 data streams.'
    );
  });
});
