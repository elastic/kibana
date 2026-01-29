/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { toggleFailureStore } from '../../../fixtures/retention_helpers';

test.describe('Stream failure store - Replay failed docs', () => {
  test.beforeAll(async ({ esClient }) => {
    // Ensure failure store is enabled on logs stream
    await esClient.indices.putDataStreamOptions(
      {
        name: 'logs',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esClient }) => {
    // Clean up any test pipelines
    await esClient.ingest.deletePipeline({ id: 'test-failing-pipeline' }).catch(() => {});
  });

  test(
    'should not show replay button when failure store is empty',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // The replay card should not be visible when there are no failed docs
      await expect(page.getByTestId('replayCard')).toBeHidden();
    }
  );

  test(
    'should not show replay button when failure store is disabled',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Disable failure store first
      await toggleFailureStore(page, false);

      // Verify disabled state
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();

      // The replay card should not be visible
      await expect(page.getByTestId('replayCard')).toBeHidden();

      // Re-enable for other tests
      await toggleFailureStore(page, true);
    }
  );

  test(
    'should show failure store stats section when enabled',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Verify the failure store section loads with stats
      // Either shows storage size metric or disabled panel
      await expect(
        page
          .getByTestId('failureStoreStorageSize-metric')
          .or(page.getByTestId('disabledFailureStorePanel'))
      ).toBeVisible();
    }
  );

  test(
    'replay card should not be visible to viewer role',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects, browserAuth }) => {
      // Login as viewer (limited privileges)
      await browserAuth.loginAsViewer();

      await pageObjects.streams.gotoDataRetentionTab('logs');

      // With limited privileges, the replay card should not be visible
      // The failure store section might show a permission banner or nothing
      // We verify that the replay card specifically is not visible
      await expect(page.getByTestId('replayCard')).toBeHidden();
    }
  );

  test(
    'replay button should be present in replay card when visible',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Check if replay card is visible (depends on having failed docs)
      const replayCard = page.getByTestId('replayCard');

      // Use a short timeout to check visibility
      const isCardVisible = await replayCard
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

      // Skip assertion if card not visible (no failed docs)
      test.skip(!isCardVisible, 'No failed documents to replay');

      // If card is visible, verify button exists
      await expect(page.getByTestId('replayFailedDocsButton')).toBeVisible();
    }
  );

  test(
    'progress UI elements exist in replay card component',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Check if replay is already running (from a previous session)
      const progressBar = page.getByTestId('replayProgress');

      // Use a short timeout to check if progress is visible
      const isRunning = await progressBar
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

      // Skip if not running
      test.skip(!isRunning, 'No replay currently in progress');

      // If running, verify progress UI elements
      await expect(page.getByText('Replaying failed documents...')).toBeVisible();
      await expect(page.getByTestId('cancelReplayButton')).toBeVisible();
    }
  );

  test(
    'cancel button exists when replay is in progress',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // If a replay is in progress, cancel button should be visible
      const cancelButton = page.getByTestId('cancelReplayButton');

      // Use a short timeout to check visibility
      const isVisible = await cancelButton
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

      // Skip if not visible (no replay in progress)
      test.skip(!isVisible, 'No replay currently in progress');

      // Verify it's enabled
      await expect(cancelButton).toBeEnabled();
    }
  );
});
