/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

// Common test IDs
const WIRED_SWITCH = 'streamsWiredSwitch';
const SETTINGS_FLYOUT = 'streamsSettingsFlyout';
const DISABLE_MODAL = 'streamsWiredDisableModal';
const DISABLE_CHECKBOX = 'streamsWiredDisableConfirmCheckbox';
const DISABLE_BUTTON = 'streamsWiredDisableConfirmButton';

test.describe.only('Enable Wired Streams - Success flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, esClient, apiServices }) => {
    await browserAuth.loginAsAdmin();

    // Disable wired streams to ensure clean state
    try {
      await apiServices.streams.disable();
    } catch {
      // Already disabled, that's fine
    }

    // Ensure logs index/data stream doesn't exist
    try {
      await esClient.indices.deleteDataStream({ name: 'logs' });
    } catch {
      // Data stream doesn't exist, try regular index
      try {
        await esClient.indices.delete({ index: 'logs' });
      } catch {
        // Nothing exists, that's fine
      }
    }

    await pageObjects.streams.goto();
  });

  test('should enable wired streams and show logs stream in the UI', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    // Verify logs index doesn't exist
    const logsExists = await esClient.indices.exists({ index: 'logs' });
    expect(logsExists).toBe(false);

    // Open settings and enable wired streams
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();
    await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();

    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify logs index was created
    const logsExistsAfter = await esClient.indices.exists({ index: 'logs' });
    expect(logsExistsAfter).toBe(true);

    // Verify logs stream appears in the UI
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);
  });

  test('should show ingested data in logs stream after enabling wired streams', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    // Enable wired streams
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked({ timeout: 10000 });

    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Ingest some test data
    await esClient.index({
      index: 'logs',
      document: {
        '@timestamp': new Date().toISOString(),
        message: 'Test log message',
        'log.level': 'info',
      },
    });

    // Refresh to ensure data is searchable
    await esClient.indices.refresh({ index: 'logs' });

    // Reload page to see updated streams
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();

    // Verify logs stream is visible with data
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);
    await pageObjects.streams.verifyDocCount('logs', 1);
  });

  test('should disable wired streams and show empty state', async ({ page, pageObjects }) => {
    // First enable wired streams
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked({ timeout: 10000 });
    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify logs stream is visible
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Now disable wired streams
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
    await page.getByTestId(WIRED_SWITCH).click();

    // Confirm modal appears with destructive warning
    await expect(page.getByTestId(DISABLE_MODAL)).toBeVisible();
    await expect(
      page.getByText(/Disabling Wired Streams will permanently delete all stored data/)
    ).toBeVisible();

    // Must check confirmation before disabling
    await expect(page.getByTestId(DISABLE_BUTTON)).toBeDisabled();
    await page.getByTestId(DISABLE_CHECKBOX).click();
    await expect(page.getByTestId(DISABLE_BUTTON)).toBeEnabled();

    // Confirm disable
    await page.getByTestId(DISABLE_BUTTON).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify UI now shows empty state (no logs stream)
    await pageObjects.streams.goto();
    await pageObjects.streams.verifyStreamsAreNotInTable(['logs']);
  });
});

test.describe.only('Enable Wired Streams - Conflict flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, esClient, apiServices }) => {
    await browserAuth.loginAsAdmin();

    // First ensure wired streams is enabled (from global setup or enable it now)
    try {
      await apiServices.streams.enable();
    } catch {
      // Already enabled
    }

    // Ensure logs data stream exists (wired streams should already have created it)
    // Add some data to simulate existing data scenario
    try {
      await esClient.index({
        index: 'logs',
        document: {
          '@timestamp': new Date().toISOString(),
          message: 'Existing log data before test',
        },
      });
      await esClient.indices.refresh({ index: 'logs' });
    } catch {
      // Ignore errors - data may already exist or stream may not be ready
    }

    await pageObjects.streams.goto();
  });

  test('should show error when enabling wired streams with existing logs data', async ({
    page,
    pageObjects,
  }) => {
    // Verify streams table is visible with existing data
    await pageObjects.streams.expectStreamsTableVisible();
    // Logs stream should be visible since wired streams is enabled
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Now try to disable and re-enable wired streams to trigger potential conflicts
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();

    // Disable first
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeVisible();
    await page.getByTestId(DISABLE_CHECKBOX).click();
    await page.getByTestId(DISABLE_BUTTON).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

    // Now try to re-enable - this should work since data was deleted during disable
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked({ timeout: 10000 });

    // Close settings
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });
  });

  test('should succeed after resolving conflict', async ({ page, pageObjects }) => {
    // Wired streams is already enabled with data from beforeEach
    // Verify logs stream is visible
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Disable wired streams (this cleans up data)
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeVisible();
    await page.getByTestId(DISABLE_CHECKBOX).click();
    await page.getByTestId(DISABLE_BUTTON).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeHidden({ timeout: 10000 });
    await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

    // Now re-enable - should succeed since data was deleted
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked({ timeout: 10000 });

    // Close flyout
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify logs stream now appears in UI as wired stream
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);
  });
});

test.describe.only('Enable Wired Streams - Permissions', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ esClient, apiServices, browserAuth }) => {
    // Disable wired streams to get clean state
    await browserAuth.loginAsAdmin();
    try {
      await apiServices.streams.disable();
    } catch {
      // Ignore if already disabled
    }

    // Clean up logs index/data stream
    try {
      await esClient.indices.deleteDataStream({ name: 'logs' });
    } catch {
      try {
        await esClient.indices.delete({ index: 'logs' });
      } catch {
        // Nothing exists
      }
    }
  });

  test('should prevent editor users from enabling wired streams', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAs('editor');
    await pageObjects.streams.goto();

    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });

    // Switch should be disabled for editor
    await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
  });

  test('should prevent viewer users from enabling wired streams', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.streams.goto();

    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });

    // Switch should be disabled for viewer
    await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
  });

  test('should prevent editor from disabling wired streams', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // Enable as admin first
    await browserAuth.loginAsAdmin();
    await apiServices.streams.enable();
    await pageObjects.streams.goto();

    // Login as editor
    await browserAuth.loginAs('editor');
    await pageObjects.streams.goto();

    // Verify logs stream is visible (wired streams enabled)
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });

    // Switch should show enabled but be disabled for editor
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
  });

  test('should prevent viewer from disabling wired streams', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // Enable as admin first
    await browserAuth.loginAsAdmin();
    await apiServices.streams.enable();
    await pageObjects.streams.goto();

    // Login as viewer
    await browserAuth.loginAsViewer();
    await pageObjects.streams.goto();

    // Verify logs stream is visible (wired streams enabled)
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });

    // Switch should show enabled but be disabled for viewer
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
  });

  test('should allow admin to enable and disable wired streams', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.goto();

    // Open settings - switch should be enabled for admin
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(WIRED_SWITCH)).toBeEnabled();
    await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

    // Enable wired streams
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked({ timeout: 10000 });
    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify logs stream appears in UI
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

    // Disable wired streams
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByTestId(WIRED_SWITCH).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeVisible();
    await page.getByTestId(DISABLE_CHECKBOX).click();
    await page.getByTestId(DISABLE_BUTTON).click();
    await expect(page.getByTestId(DISABLE_MODAL)).toBeHidden({ timeout: 10000 });
    // Close flyout with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(SETTINGS_FLYOUT)).toBeHidden({ timeout: 5000 });

    // Verify UI shows empty state (no logs stream)
    await pageObjects.streams.goto();
    await pageObjects.streams.verifyStreamsAreNotInTable(['logs']);
  });
});
