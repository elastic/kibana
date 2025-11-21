/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  toggleInheritSwitch,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - ILM policy', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamChildren('logs');
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
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
    await expect(page.getByTestId('lifecycleBadge-logs.nginx')).toContainText('.alerts-ilm-policy');
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
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

    // Verify ILM policy persists
    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('ILM policy');
    await expect(page.getByTestId('lifecycleBadge-logs.nginx')).toContainText('.alerts-ilm-policy');
  });
});
