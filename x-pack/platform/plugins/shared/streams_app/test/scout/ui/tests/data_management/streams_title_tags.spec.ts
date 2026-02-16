/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const TEST_STREAM_NAME = 'logs-test-title-tags';

test.describe.serial('Stream tags - Advanced Settings', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    const currentTime = Date.now();
    // Generate 10 logs over the last 5 minutes to create a classic stream
    await generateLogsData(logsSynthtraceEsClient)({
      index: TEST_STREAM_NAME,
      startTime: new Date(currentTime - 5 * 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 2,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.deleteStream(TEST_STREAM_NAME);
  });

  test('shows empty tags in advanced settings by default', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Verify empty state for tags (field is always editable, so check for empty values)
    await pageObjects.streams.expectStreamMetadataTagsEmpty();
  });

  test('can add and display tags in advanced settings', async ({ pageObjects, page }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Add tags (no edit button needed - always editable)
    await pageObjects.streams.addStreamMetadataTag('test-tag');
    await pageObjects.streams.addStreamMetadataTag('production');

    // Bottom bar should appear with changes
    await pageObjects.streams.expectStreamSettingsBottomBarVisible();

    // Save via bottom bar
    await pageObjects.streams.saveStreamSettings();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify the tags are displayed
    await pageObjects.streams.expectStreamMetadataTag('test-tag');
    await pageObjects.streams.expectStreamMetadataTag('production');

    // Refresh page to verify persistence
    await page.reload();
    await pageObjects.streams.expectStreamMetadataTag('test-tag');
    await pageObjects.streams.expectStreamMetadataTag('production');
  });

  test('can cancel tags edit without saving', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Add a new tag
    await pageObjects.streams.addStreamMetadataTag('cancelled-tag');

    // Bottom bar should appear
    await pageObjects.streams.expectStreamSettingsBottomBarVisible();

    // Cancel via bottom bar
    await pageObjects.streams.cancelStreamSettingsChanges();

    // Verify original tags are still displayed
    await pageObjects.streams.expectStreamMetadataTag('test-tag');
    await pageObjects.streams.expectStreamMetadataTag('production');

    // Bottom bar should be hidden after cancel
    await pageObjects.streams.expectStreamSettingsBottomBarHidden();
  });
});
