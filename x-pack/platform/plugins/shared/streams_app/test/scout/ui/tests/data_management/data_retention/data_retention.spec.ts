/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

test.describe(
  'Stream data retention - updating data retention',
  { tag: ['@ess', '@svlOblt'] },
  () => {
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

    test('should update a stream data retention policy successfully', async ({ page }) => {
      // Update to a specific retention policy first
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();

      // Toggle off the inherit switch to enable other options
      await page.getByTestId('inheritDataRetentionSwitch').click();
      await expect(page.getByTestId('inheritDataRetentionSwitch')).not.toBeChecked();

      await page.getByRole('button', { name: 'Custom period' }).click();
      await page.getByTestId('streamsAppDslModalDaysField').fill('7');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('retention-metric').getByText('7 days')).toBeVisible();
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
      await pageObjects.toasts.closeAll();

      // Reset the retention policy
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();

      // Toggle the inherit switch back on
      await page.getByTestId('inheritDataRetentionSwitch').click();
      await expect(page.getByTestId('inheritDataRetentionSwitch')).toBeChecked();
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByTestId('retention-metric').getByText('∞')).toBeVisible();
    });
  }
);
