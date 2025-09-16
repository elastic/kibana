/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe(
  'Stream data retention - updating data retention',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.enable();
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs', 'logs.nginx', {
        field: 'service.name',
        eq: 'nginx',
      });

      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.streams.disable();
    });

    test('should update a stream data retention policy successfully', async ({
      page,
      pageObjects,
    }) => {
      // Update to a specific retention policy first
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();

      // Toggle off the inherit switch to enable other options
      await page.getByTestId('inheritDataRetentionSwitch').click();
      await expect(page.getByTestId('inheritDataRetentionSwitch')).not.toBeChecked();

      await page.getByRole('button', { name: 'Custom period' }).click();
      await page.getByTestId('streamsAppDslModalDaysField').fill('7');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('retention-metric').getByText('7 days')).toBeVisible();
      await pageObjects.streams.closeToasts();
    });

    test('should reset a stream data retention policy successfully', async ({
      page,
      pageObjects,
    }) => {
      // Set a specific retention policy first
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();

      // Toggle off the inherit switch to enable other options
      await page.getByTestId('inheritDataRetentionSwitch').click();
      await expect(page.getByTestId('inheritDataRetentionSwitch')).not.toBeChecked();
      await page.getByRole('button', { name: 'Custom period' }).click();
      await page.getByTestId('streamsAppDslModalDaysField').fill('7');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('retention-metric').getByText('7 days')).toBeVisible();
      await pageObjects.streams.closeToasts();

      // Reset the retention policy
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();

      // Toggle the inherit switch back on
      await page.getByTestId('inheritDataRetentionSwitch').click();
      await expect(page.getByTestId('inheritDataRetentionSwitch')).toBeChecked();
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByTestId('retention-metric').getByText('∞')).toBeVisible();
      await pageObjects.streams.closeToasts();
    });

    test('should enable failure store', async ({ page, pageObjects }) => {
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
      await pageObjects.streams.closeToasts();
    });

    test('should edit failure store successfully', async ({ page, pageObjects }) => {
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
      await pageObjects.streams.closeToasts();

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
      await pageObjects.streams.closeToasts();
    });

    test('should disable failure store', async ({ page, pageObjects }) => {
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
      await pageObjects.streams.closeToasts();

      // Disable failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
      await pageObjects.streams.closeToasts();
    });
  }
);
