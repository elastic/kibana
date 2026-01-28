/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const TEST_STREAM_NAME = 'logs-test-title-tags';

test.describe('Stream title and tags - Advanced Settings', { tag: ['@ess', '@svlOblt'] }, () => {
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

  test('shows empty title and tags in advanced settings by default', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Verify empty state for title and tags panels
    await pageObjects.streams.expectStreamTitlePanelEmpty();
    await pageObjects.streams.expectStreamTagsPanelEmpty();
  });

  test('can add and display title in advanced settings', async ({ pageObjects, page }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Click edit button for title panel
    await pageObjects.streams.clickStreamTitlePanelEdit();

    // Fill in the title
    await pageObjects.streams.fillStreamTitlePanelInput('Test Stream Title');

    // Save the title
    await pageObjects.streams.saveStreamTitlePanel();

    // Wait for save to complete (toast notification)
    await page.waitForTimeout(1000);

    // Verify the title is displayed in the panel
    await pageObjects.streams.expectStreamTitlePanelDisplay('Test Stream Title');

    // Refresh page to verify persistence
    await page.reload();
    await pageObjects.streams.expectStreamTitlePanelDisplay('Test Stream Title');
  });

  test('can add and display tags in advanced settings', async ({ pageObjects, page }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Click edit button for tags panel
    await pageObjects.streams.clickStreamTagsPanelEdit();

    // Add tags
    await pageObjects.streams.addStreamTagInPanel('test-tag');
    await pageObjects.streams.addStreamTagInPanel('production');

    // Save the tags
    await pageObjects.streams.saveStreamTagsPanel();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify the tags are displayed in the panel
    await pageObjects.streams.expectStreamTagsPanelBadge('test-tag');
    await pageObjects.streams.expectStreamTagsPanelBadge('production');

    // Refresh page to verify persistence
    await page.reload();
    await pageObjects.streams.expectStreamTagsPanelBadge('test-tag');
    await pageObjects.streams.expectStreamTagsPanelBadge('production');
  });

  test('can cancel title edit without saving', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Click edit button for title panel
    await pageObjects.streams.clickStreamTitlePanelEdit();

    // Fill in a new title
    await pageObjects.streams.fillStreamTitlePanelInput('Cancelled Title');

    // Cancel without saving
    await pageObjects.streams.cancelStreamTitlePanel();

    // Verify the original title is still displayed (Test Stream Title from previous test)
    await pageObjects.streams.expectStreamTitlePanelDisplay('Test Stream Title');
  });

  test('can cancel tags edit without saving', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Click edit button for tags panel
    await pageObjects.streams.clickStreamTagsPanelEdit();

    // Add a new tag
    await pageObjects.streams.addStreamTagInPanel('cancelled-tag');

    // Cancel without saving
    await pageObjects.streams.cancelStreamTagsPanel();

    // Verify original tags are still displayed
    await pageObjects.streams.expectStreamTagsPanelBadge('test-tag');
    await pageObjects.streams.expectStreamTagsPanelBadge('production');
  });

  test('can clear title by saving empty value', async ({ pageObjects, page }) => {
    await pageObjects.streams.gotoAdvancedTab(TEST_STREAM_NAME);

    // Click edit button for title panel
    await pageObjects.streams.clickStreamTitlePanelEdit();

    // Clear the title
    await pageObjects.streams.fillStreamTitlePanelInput('');

    // Save the empty title
    await pageObjects.streams.saveStreamTitlePanel();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify the title panel shows "No title set"
    await pageObjects.streams.expectStreamTitlePanelEmpty();
  });
});
