/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data retention - updating failure store',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, esClient }) => {
      await apiServices.streams.enable();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
      await esClient.indices.putDataStreamOptions(
        {
          name: 'logs-generic-default',
          failure_store: {
            enabled: true,
          },
        },
        { meta: true }
      );
    });

    test.beforeEach(async ({ apiServices, browserAuth }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs', 'logs.nginx', {
        field: 'service.name',
        eq: 'nginx',
      });
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('should edit failure store successfully for classic streams', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Update the retention period
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('7');
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('7 days')
      ).toBeVisible();
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Custom retention period')
      ).toBeVisible();
    });

    test('should disable failure store for classic streams', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Disable failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
    });

    test('should enable failure store for classic streams', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

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
    });

    test('should not allow edit failure store for wired streams', async ({
      page,
      pageObjects,
      esClient,
    }) => {
      // Enable failure store for the forked stream first
      await esClient.indices.putDataStreamOptions(
        {
          name: 'logs.nginx',
          failure_store: {
            enabled: true,
          },
        },
        { meta: true }
      );

      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
      // Verify the retention card is present but the edit button is not shown
      await expect(page.getByTestId('failureStoreRetention-metric')).toBeVisible();
      await expect(page.getByTestId('streamFailureStoreEditRetention')).toBeHidden();
    });

    test('should not allow enabling failure store for wired streams', async ({
      page,
      pageObjects,
      esClient,
    }) => {
      // Enable failure store for the forked stream first
      await esClient.indices.putDataStreamOptions(
        {
          name: 'logs.nginx',
          failure_store: {
            enabled: false,
          },
        },
        { meta: true }
      );

      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
      // Verify the retention no failure store panel is present but the enable button is not shown
      await expect(page.getByTestId('disabledFailureStorePanel')).toBeVisible();
      await expect(page.getByTestId('streamsAppFailureStoreEnableButton')).toBeHidden();
    });

    test('should set failure store retention to different value than main retention', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Set main retention to 30 days
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();
      await page.getByRole('button', { name: 'Custom period' }).click();
      await page.getByTestId('streamsAppDslModalDaysField').fill('30');
      await page.getByRole('button', { name: 'Save' }).click();

      // Set failure store retention to 7 days
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('7');
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify both are set correctly
      await expect(page.getByTestId('retention-metric').getByText('30 days')).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('7 days')
      ).toBeVisible();
    });

    test('should change failure store retention multiple times', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Set to 7 days
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      let dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('7');
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('7 days')
      ).toBeVisible();

      // Change to 14 days
      await page.getByTestId('streamFailureStoreEditRetention').click();
      dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('14');
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('14 days')
      ).toBeVisible();
    });

    test('should persist failure store retention across page reload', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('21');
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Reload page
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Verify value persists
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('21 days')
      ).toBeVisible();
    });

    test('should cancel failure store retention edit', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

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
    });

    test('should display failure store and main retention independently', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Verify both cards are visible
      await expect(page.getByTestId('retentionCard')).toBeVisible();
      await expect(page.getByTestId('failureStoreRetentionCard')).toBeVisible();

      // Verify they have different test IDs
      await expect(page.getByTestId('retention-metric')).toBeVisible();
      await expect(page.getByTestId('failureStoreRetention-metric')).toBeVisible();
    });

    test('should show failure store disabled state', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      await expect(page.getByTestId('disabledFailureStorePanel')).toBeVisible();
      await expect(page.getByText('Failure store disabled')).toBeVisible();
    });

    test('should show enable button when failure store is disabled', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Disable first
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify enable button appears
      await expect(page.getByTestId('streamsAppFailureStoreEnableButton')).toBeVisible();
    });

    test('should validate failure store retention value', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');

      // Try invalid value
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('-5');

      // Should show validation error or disable save button
      // (exact behavior depends on implementation)
      await expect(page.getByTestId('failureStoreModalSaveButton')).toBeDisabled();
    });
  }
);
