/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import {
  test,
  getUniqueStreamName,
  getUniqueClassicStreamName,
  safeDeleteStream,
  safeClearStreamProcessors,
} from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';
import {
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  setFailureStoreRetention,
  toggleFailureStore,
  toggleInheritSwitch,
  verifyRetentionDisplay,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - updating failure store', () => {
  // Track streams created per worker for cleanup
  let classicStreamName: string;
  let wiredStreamName: string;

  test.beforeEach(
    async ({ apiServices, browserAuth, logsSynthtraceEsClient, esClient }, testInfo) => {
      await browserAuth.loginAsAdmin();

      // Generate unique stream names for this worker
      classicStreamName = getUniqueClassicStreamName(testInfo, 'failure-store');
      wiredStreamName = getUniqueStreamName(testInfo, 'failure-store');

      // Clean up any existing streams from previous runs
      await safeDeleteStream(apiServices, classicStreamName);
      await safeDeleteStream(apiServices, wiredStreamName);

      // Create classic stream with failure store enabled
      await generateLogsData(logsSynthtraceEsClient)({ index: classicStreamName });
      try {
        await esClient.indices.putDataStreamOptions(
          {
            name: classicStreamName,
            failure_store: {
              enabled: true,
            },
          },
          { meta: true }
        );
      } catch {
        // Stream might not support this operation yet
      }

      // Create wired stream with failure store enabled
      await apiServices.streams.forkStream('logs', wiredStreamName, {
        field: 'service.name',
        eq: `failure-store-w${testInfo.parallelIndex}`,
      });
      try {
        await esClient.indices.putDataStreamOptions(
          {
            name: wiredStreamName,
            failure_store: {
              enabled: true,
            },
          },
          { meta: true }
        );
      } catch {
        // Stream might not support this operation yet
      }

      // Clear processors for classic stream
      await safeClearStreamProcessors(apiServices, classicStreamName);
    }
  );

  test.afterEach(async ({ apiServices, logsSynthtraceEsClient }) => {
    // Clean up streams created during this test
    await safeDeleteStream(apiServices, wiredStreamName);
    await safeDeleteStream(apiServices, classicStreamName);
    await logsSynthtraceEsClient.clean();
  });

  test(
    'should edit failure store successfully for classic streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await setFailureStoreRetention(page, '7', 'd');
      await verifyRetentionDisplay(page, '7 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Custom retention period')
      ).toBeVisible();
    }
  );

  test(
    'should disable failure store for classic streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await toggleFailureStore(page, false);
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
    }
  );

  test(
    'should enable failure store for classic streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await toggleFailureStore(page, true);
      await verifyRetentionDisplay(page, '30 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Default retention period')
      ).toBeVisible();
    }
  );

  test(
    'should be able to disable lifecycle for classic if is not serverless',
    { tag: '@ess' },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await page.getByTestId('streamFailureStoreEditRetention').click();

      // The disable lifecycle option should be visible on ESS
      await expect(page.getByTestId('disabledLifecycle')).toBeVisible();

      // Enable disable lifecycle
      await page.getByTestId('disabledLifecycle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify infinite retention is shown
      await expect(page.getByTestId('failureStoreRetention-metric').getByText('∞')).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Indefinite retention')
      ).toBeVisible();
    }
  );

  test(
    'should inherit failure store for classic streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      // Enable inherit failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('inheritFailureStoreSwitch').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Inherit from index template')
      ).toBeVisible();
    }
  );

  test(
    'should edit failure store successfully for wired streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(wiredStreamName);

      await setFailureStoreRetention(page, '7', 'd');
      await verifyRetentionDisplay(page, '7 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Custom retention period')
      ).toBeVisible();
    }
  );

  test(
    'should disable failure store for wired streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(wiredStreamName);

      // Disable failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
    }
  );

  test(
    'should enable failure store for wired streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(wiredStreamName);

      // Enable failure store again
      await page.getByTestId('streamsAppFailureStoreEnableButton').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Default retention period')
      ).toBeVisible();
    }
  );

  test(
    'should be able to disable lifecycle for wired streams on ESS',
    { tag: '@ess' },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(wiredStreamName);

      await page.getByTestId('streamFailureStoreEditRetention').click();

      // The disable lifecycle option should be visible on ESS
      await expect(page.getByTestId('disabledLifecycle')).toBeVisible();

      // Enable disable lifecycle
      await page.getByTestId('disabledLifecycle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify infinite retention is shown
      await expect(page.getByTestId('failureStoreRetention-metric').getByText('∞')).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Indefinite retention')
      ).toBeVisible();
    }
  );

  test(
    'should inherit failure store for child wired streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(wiredStreamName);

      // Enable inherit failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('inheritFailureStoreSwitch').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Inherit from parent')
      ).toBeVisible();
    }
  );

  test(
    'should not inherit failure store for root wired streams',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Try to enable inherit failure store - the switch should not be visible for root streams
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await expect(page.getByTestId('inheritFailureStoreSwitch')).toBeHidden();
    }
  );

  test(
    'should set failure store retention to different value than main retention',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      // Set main retention to 30 days
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '30', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '30 days');

      // Set failure store retention to 7 days
      await setFailureStoreRetention(page, '7', 'd');

      // Verify both are set correctly
      await expect(page.getByTestId('retention-metric')).toContainText('30 days');
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText('7 days');
    }
  );

  test(
    'should persist failure store retention across page reload',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await setFailureStoreRetention(page, '21', 'd');

      // Reload page
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      // Verify value persists
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText('21 days');
    }
  );

  test(
    'should cancel failure store retention edit',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      // Get current value
      const initialRetention = await page.getByTestId('failureStoreRetention-metric').textContent();

      // Open modal and change value but cancel
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('99');
      await page.getByTestId('failureStoreModalCancelButton').click();

      // Verify value unchanged
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText(
        initialRetention || ''
      );
    }
  );

  test(
    'should show failure store disabled state',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await toggleFailureStore(page, false);

      await expect(page.getByTestId('disabledFailureStorePanel')).toBeVisible();
      await expect(page.getByText('Failure store disabled')).toBeVisible();
    }
  );
});
