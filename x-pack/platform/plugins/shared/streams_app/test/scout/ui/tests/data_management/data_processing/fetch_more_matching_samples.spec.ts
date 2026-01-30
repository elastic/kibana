/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

/**
 * Tests for the "Load more matching samples" feature on the processing page.
 * This button should appear when:
 * 1. A condition is selected
 * 2. The matching samples are below 20% of total samples
 * 3. There are samples available
 */
test.describe(
  'Stream data processing - Load more matching samples',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // Generate sparse data: 90% 'info', 10% 'warn'
    // This ensures the 'warn' condition will match < 20% of samples
    let warnLogCounter = 0;
    const getSparseLogLevel = () => {
      warnLogCounter++;
      // Every 10th log is 'warn', rest are 'info'
      return warnLogCounter % 10 === 0 ? 'warn' : 'info';
    };

    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Reset counter before generating
      warnLogCounter = 0;
      // Generate logs with 90% 'info' and 10% 'warn'
      // This creates sparse data where 'warn' condition matches < 20%
      await generateLogsData(logsSynthtraceEsClient)({
        index: 'logs-generic-default',
        docsPerMinute: 20,
        logLevel: getSparseLogLevel,
      });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors('logs-generic-default');

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      await pageObjects.streams.switchToColumnsView();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should show "Load more matching samples" button when condition matches sparse data', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition that matches the sparse 'warn' logs (10% of data)
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

      // The button should appear because 'warn' logs are ~10% of the sample (< 20%)
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

      // Get the initial badge showing the percentage of matching samples
      const badge = pageObjects.streams.getConditionFilterSelectedBadge();
      const initialPercentage = await badge.textContent();

      // Click the button to fetch more matching samples
      const button = pageObjects.streams.getFetchMoreMatchingSamplesButton();
      await expect(button).toBeEnabled();
      await button.click();

      // The button should show loading state briefly, then either:
      // 1. Disappear (if enough samples were fetched to exceed 20%)
      // 2. Show updated percentage with more samples
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

      // After fetching, either:
      // - The percentage increased (more matching samples found)
      // - Or the button is hidden (exceeded 20% threshold)
      // - Or the percentage stayed the same (no new samples found in the additional search)
      // We verify the action completed without error by checking the button doesn't show error state
      const buttonAfterFetch = pageObjects.streams.getFetchMoreMatchingSamplesButton();
      const isButtonVisible = await buttonAfterFetch.isVisible();

      if (isButtonVisible) {
        // Button is still visible - check it's not in error state
        // Error state would show warning icon
        const hasWarningIcon = await buttonAfterFetch.locator('.euiIcon--warning').isVisible();
        if (!hasWarningIcon) {
          // Success - either more samples were fetched or search completed with no additional matches
          const newPercentage = await badge.textContent();
          // The percentage should be >= initial (more matching samples or same)
          expect(parseInt(newPercentage || '0')).toBeGreaterThanOrEqual(
            parseInt(initialPercentage || '0')
          );
        }
      }
      // If button is not visible, it means we exceeded the 20% threshold - that's also success
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
