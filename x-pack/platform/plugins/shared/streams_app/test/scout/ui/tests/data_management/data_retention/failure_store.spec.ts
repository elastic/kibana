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
  }
);
