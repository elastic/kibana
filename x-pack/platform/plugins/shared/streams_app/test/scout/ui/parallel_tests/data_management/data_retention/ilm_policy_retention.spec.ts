/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { omit } from 'lodash';
import { test, getUniqueStreamName, safeDeleteStream } from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  toggleInheritSwitch,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - ILM policy', { tag: ['@ess'] }, () => {
  let testStreamName: string;

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
    await browserAuth.loginAsAdmin();

    // Generate unique stream name for this worker
    testStreamName = getUniqueStreamName(testInfo, 'ilm-policy');
    await safeDeleteStream(apiServices, testStreamName);

    // Reset parent 'logs' stream to default indefinite retention (DSL with no data_retention)
    const logsDefinition = await apiServices.streams.getStreamDefinition('logs');
    await apiServices.streams.updateStream('logs', {
      ingest: {
        ...logsDefinition.stream.ingest,
        processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
        lifecycle: { dsl: {} },
      },
    });

    await apiServices.streams.forkStream('logs', testStreamName, {
      field: 'service.name',
      eq: `ilm-policy-w${testInfo.workerIndex}`,
    });
    await pageObjects.streams.gotoDataRetentionTab(testStreamName);
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await safeDeleteStream(apiServices, testStreamName);
  });

  test('should show ILM policy button', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await expect(page.getByRole('button', { name: 'ILM policy' })).toBeVisible();
  });

  test('should select and save ILM policy', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Click ILM policy button
    await page.getByRole('button', { name: 'ILM policy' }).click();

    // Wait for the listbox to appear and select the first available policy
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();

    // Save changes
    await saveRetentionChanges(page);

    // Verify ILM policy is displayed in subtitle
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
  });

  test('should display selected ILM policy name', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Click ILM policy button and select policy
    await page.getByRole('button', { name: 'ILM policy' }).click();
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();

    // Save changes
    await saveRetentionChanges(page);

    // Verify the policy name is displayed using the badge test ID
    await expect(page.getByTestId(`lifecycleBadge-${testStreamName}`)).toContainText(
      '.alerts-ilm-policy'
    );
  });

  test('should persist ILM policy selection across page reload', async ({ page, pageObjects }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Select ILM policy
    await page.getByRole('button', { name: 'ILM policy' }).click();
    await page.getByRole('listbox', { name: 'Filter options' }).waitFor();
    await page.getByRole('option', { name: /.alerts-ilm-policy/ }).click();
    await saveRetentionChanges(page);

    // Reload page
    await pageObjects.streams.gotoDataRetentionTab(testStreamName);

    // Verify ILM policy persists
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
    await expect(page.getByTestId(`lifecycleBadge-${testStreamName}`)).toContainText(
      '.alerts-ilm-policy'
    );
  });
});
