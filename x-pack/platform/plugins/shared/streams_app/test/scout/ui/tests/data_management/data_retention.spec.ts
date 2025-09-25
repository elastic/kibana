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
      await page.getByRole('button', { name: 'Set specific retention days' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('streamsAppDslModalDaysField').fill('7');

      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('retention-metric').getByText('7 days')).toBeVisible();
      await pageObjects.streams.closeToasts();
    });

    test('should reset a stream data retention policy successfully', async ({
      page,
      pageObjects,
    }) => {
      // Set a specific retention policy first
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();
      await page.getByRole('button', { name: 'Set specific retention days' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('streamsAppDslModalDaysField').fill('7');

      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('retention-metric').getByText('7 days')).toBeVisible();
      await pageObjects.streams.closeToasts();

      // Reset the retention policy
      await page.getByTestId('streamsAppRetentionMetadataEditDataRetentionButton').click();
      await page.getByRole('button', { name: 'Reset to default', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Set to default', exact: true })
        .click();
      await expect(page.getByTestId('retention-metric').getByText('∞')).toBeVisible();
      await pageObjects.streams.closeToasts();
    });
  }
);
