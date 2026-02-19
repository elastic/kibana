/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type EsClient } from '@kbn/scout';
import { test } from '../../../fixtures';

const TEST_STREAM_NAME = 'logs-fetchmore-test';

/**
 * Creates controlled test data with a known distribution.
 * We create 200 documents total:
 * - 190 with log.level='info' (95%)
 * - 10 with log.level='warn' (5%)
 *
 * This ensures that when 50 samples are initially loaded:
 * - Only ~2-3 will be 'warn' (~5% of 50)
 * - This is well below the 20% threshold, so the "Load more" button will appear
 *
 * The 'warn' documents have older timestamps to ensure they won't be in
 * the initial sample (which fetches the most recent documents).
 */
async function indexControlledTestData(esClient: EsClient) {
  const now = Date.now();
  const documents = [];

  // Create 190 'info' logs with recent timestamps (these will be in the initial sample)
  for (let i = 0; i < 190; i++) {
    documents.push({ create: {} });
    documents.push({
      '@timestamp': new Date(now - i * 60000).toISOString(), // Each 1 minute apart
      message: `Test log message ${i}`,
      'log.level': 'info',
      'host.name': 'test-host',
      'service.name': 'test-service',
    });
  }

  // Create 10 'warn' logs with older timestamps (these won't be in the initial sample)
  // These are placed at timestamps older than all 'info' logs
  for (let i = 0; i < 10; i++) {
    documents.push({ create: {} });
    documents.push({
      '@timestamp': new Date(now - (200 + i) * 60000).toISOString(), // Older than all 'info' logs
      message: `Warning log message ${i}`,
      'log.level': 'warn',
      'host.name': 'test-host',
      'service.name': 'test-service',
    });
  }

  await esClient.bulk({
    index: TEST_STREAM_NAME,
    operations: documents,
    refresh: true,
  });
}

/**
 * Cleanup function to delete the test data stream
 */
async function cleanupTestData(esClient: EsClient) {
  try {
    await esClient.indices.deleteDataStream({ name: TEST_STREAM_NAME });
  } catch {
    // Ignore errors if data stream doesn't exist
  }
}

/**
 * Tests for the "Load more matching samples" feature on the processing page.
 * This button should appear when:
 * 1. A condition is selected
 * 2. The matching samples are below 20% of total samples
 * 3. There are samples available
 *
 * This test uses controlled data ingestion (not synthtrace) to ensure
 * deterministic behavior and avoid conditional test logic.
 */
test.describe(
  'Stream data processing - Load more matching samples',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await indexControlledTestData(esClient);
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors(TEST_STREAM_NAME);

      await pageObjects.streams.gotoProcessingTab(TEST_STREAM_NAME);
      await pageObjects.streams.switchToColumnsView();
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.streams.clearStreamProcessors(TEST_STREAM_NAME);
      await cleanupTestData(esClient);
    });

    test('should show "Load more matching samples" button when condition matches sparse data', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches the sparse 'warn' logs (5% of data)
      // Since all 'warn' logs have older timestamps, they won't be in the initial sample
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'warn');
      await pageObjects.streams.clickSaveCondition();

      // Wait for the condition to be created
      const conditions = await pageObjects.streams.getConditionsListItems();
      expect(conditions).toHaveLength(1);

      // Note: Condition filtering is only enabled when there's a new processor under the condition
      // or when the condition is already selected. Add a processor under the condition.
      const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
      await addStepButton.click();
      await pageObjects.streams.clickAddProcessor(false);
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:test_field}');
      await pageObjects.streams.clickSaveProcessor();

      // Wait for the simulation to run and the filter option to become available
      // The filter buttons should become enabled when simulation completes
      await expect(page.getByRole('button', { name: 'All samples' })).toBeEnabled();

      // Now click on the condition to filter by it using the context menu
      await pageObjects.streams.clickConditionToFilter(0);

      // Wait for the condition filter button to appear (indicates condition is selected)
      await pageObjects.streams.expectConditionFilterButtonVisible();

      // The button should appear because 'warn' logs are 0% of the initial sample
      // (they all have older timestamps and won't be in the first 50 docs)
      await pageObjects.streams.expectFetchMoreMatchingSamplesButtonVisible();
    });

    test('should fetch more matching samples when clicking the button', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches the sparse 'warn' logs
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'warn');
      await pageObjects.streams.clickSaveCondition();

      // Wait for the condition to be created
      const conditions = await pageObjects.streams.getConditionsListItems();
      expect(conditions).toHaveLength(1);

      // Add a processor under the condition to enable filtering
      const addStepButton = await pageObjects.streams.getConditionAddStepMenuButton(0);
      await addStepButton.click();
      await pageObjects.streams.clickAddProcessor(false);
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:test_field}');
      await pageObjects.streams.clickSaveProcessor();

      // Wait for the simulation to run
      await expect(page.getByRole('button', { name: 'All samples' })).toBeEnabled();

      // Click on the condition to filter by it
      await pageObjects.streams.clickConditionToFilter(0);

      // Wait for the button to appear
      await pageObjects.streams.expectFetchMoreMatchingSamplesButtonVisible();

      // Verify initial state: no 'warn' logs in the preview table
      // because all 'warn' logs have older timestamps and won't be in the first 50 docs
      await pageObjects.streams.switchToColumnsView();
      const initialRows = await pageObjects.streams.getPreviewTableRows();
      expect(initialRows.length).toBeGreaterThan(0);

      // All initial rows should have 'info' level (no 'warn' logs in initial sample)
      for (let rowIndex = 0; rowIndex < initialRows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'log.level',
          rowIndex,
          value: 'warn',
          invertCondition: true, // Should NOT contain 'warn'
        });
      }

      // Click the button to fetch more matching samples
      const button = pageObjects.streams.getFetchMoreMatchingSamplesButton();
      await expect(button).toBeEnabled();
      await button.click();

      // Wait for the action to complete (loading to finish)
      await page.waitForFunction(
        () => {
          const loadingSpinner = document.querySelector(
            '[data-test-subj="streamsAppFetchMoreMatchingSamplesButton"] .euiLoadingSpinner'
          );
          return !loadingSpinner;
        },
        { timeout: 10000 }
      );

      // After fetching, validate that actual 'warn' documents now appear in the preview table
      // The "load more" query (without time range limitation) should have found the 'warn' logs
      const updatedRows = await pageObjects.streams.getPreviewTableRows();
      expect(updatedRows.length).toBeGreaterThan(0);

      // Verify that at least one cell in the log.level column contains 'warn'
      // Use Playwright's locator to find cells with 'warn' value directly
      const warnLogCells = page.locator('[data-gridcell-column-id="log.level"]', {
        hasText: 'warn',
      });
      // Verify at least one 'warn' log document was fetched and is now in the preview
      const warnLogCount = await warnLogCells.count();
      expect(warnLogCount).toBeGreaterThan(0);

      // Also verify by checking the message column for the warning message pattern
      const warningMessageCells = page.locator('[data-gridcell-column-id="message"]', {
        hasText: 'Warning log message',
      });
      const warningMessageCount = await warningMessageCells.count();
      expect(warningMessageCount).toBeGreaterThan(0);
    });

    test('should not show "Load more matching samples" button when no condition is selected', async ({
      pageObjects,
    }) => {
      // Create a condition but don't select it
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('log.level', 'equals', 'warn');
      await pageObjects.streams.clickSaveCondition();

      // Wait for the condition to be created
      const conditions = await pageObjects.streams.getConditionsListItems();
      expect(conditions).toHaveLength(1);

      // Without clicking on the condition, the button should not appear
      await pageObjects.streams.expectFetchMoreMatchingSamplesButtonHidden();
    });
  }
);
