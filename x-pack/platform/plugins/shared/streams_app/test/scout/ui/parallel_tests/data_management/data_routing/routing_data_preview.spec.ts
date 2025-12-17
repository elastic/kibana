/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { expect, type TestInfo } from '@kbn/scout';
import {
  test,
  getUniqueStreamName,
  getUniqueNestedStreamName,
  safeDeleteStream,
} from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

// Store stream names for cleanup
let parentStream: string;
let childStream1: string;
let childStream2: string;

test.describe('Stream data routing - previewing data', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    // Generate logs data only
    await logsSynthtraceEsClient.clean();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
    await pageObjects.streams.switchToColumnsView();
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    // Clean up any streams created during tests
    if (childStream2) await safeDeleteStream(apiServices, childStream2);
    if (childStream1) await safeDeleteStream(apiServices, childStream1);
    if (parentStream) await safeDeleteStream(apiServices, parentStream);
    // Clear synthtrace data
    await logsSynthtraceEsClient.clean();
  });

  test('should show preview during rule creation', async ({ pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('preview-test');

    // Set condition that should match the test data
    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    // Verify preview panel shows matching documents
    await pageObjects.streams.expectPreviewPanelVisible();
    const rows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'severity_text',
        rowIndex,
        value: 'info',
      });
    }
  });

  test('should update preview when condition changes', async ({ pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('preview-test');

    // Set condition that should match the test data
    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    // Verify preview panel shows matching documents
    await pageObjects.streams.expectPreviewPanelVisible();
    const rows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'severity_text',
        rowIndex,
        value: 'info',
      });
    }

    // Change condition to match a different value
    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'warn',
    });

    // Verify preview panel updated documents
    await pageObjects.streams.expectPreviewPanelVisible();
    const updatedRows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < updatedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'severity_text',
        rowIndex,
        value: 'warn',
      });
    }
  });

  test('should show no matches when condition matches nothing', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('no-matches');

    // Set condition that won't match anything
    await pageObjects.streams.fillConditionEditor({
      field: 'nonexistent.field',
      value: 'nonexistent-value',
      operator: 'equals',
    });

    // Should show no matching documents
    await expect(page.getByTestId('streamsAppRoutingPreviewEmptyPromptTitle')).toBeVisible();
  });

  test('should show document filter controls when there is data by default', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.expectPreviewPanelVisible();

    await expect(page.getByTestId('routingPreviewFilterControls')).toBeVisible();
  });

  test('should select matched filter by default when condition is set', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('filter-controls-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    await pageObjects.streams.expectPreviewPanelVisible();

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toBeVisible();
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toBeVisible();

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toContainText('%');
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toContainText('%');
  });

  test('should maintain filter state when condition changes', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('filter-state-test');

    // Set initial condition
    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    // Switch to unmatched filter
    await page.getByTestId('routingPreviewUnmatchedFilterButton').click();

    // Verify unmatched filter is selected
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Change condition
    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'warn',
    });

    // Wait for preview to update
    await pageObjects.streams.expectPreviewPanelVisible();

    // Verify filter state is maintained (still showing unmatched)
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('should handle "no data" when date range has no documents', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('no-data-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    // Set date range to far future where no data exists
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Jan 1, 2099 @ 00:00:00.000',
      to: 'Jan 2, 2099 @ 00:00:00.000',
    });

    // Should show no documents message
    await expect(page.getByTestId('streamsAppRoutingPreviewEmptyPromptTitle')).toBeVisible();
  });

  test('should display child stream count badge for nested routing rules', async ({
    page,
    apiServices,
    pageObjects,
  }, testInfo: TestInfo) => {
    // Generate unique stream names for this worker
    parentStream = getUniqueStreamName(testInfo, 'preview-parent');
    childStream1 = getUniqueNestedStreamName(testInfo, 'preview-parent', 'child1');
    childStream2 = getUniqueNestedStreamName(testInfo, 'preview-parent', 'child2');

    // Clean up any existing streams from previous runs
    await safeDeleteStream(apiServices, childStream2);
    await safeDeleteStream(apiServices, childStream1);
    await safeDeleteStream(apiServices, parentStream);

    // Create a parent stream with a child
    await apiServices.streams.forkStream('logs', parentStream, {
      field: 'service.name',
      eq: `parent-w${testInfo.parallelIndex}`,
    });

    // Create a child under the parent
    await apiServices.streams.forkStream(parentStream, childStream1, {
      field: 'severity_text',
      eq: 'info',
    });

    await apiServices.streams.forkStream(parentStream, childStream2, {
      field: 'severity_text',
      eq: 'warn',
    });

    await pageObjects.streams.gotoPartitioningTab('logs');

    // Should see +2 badge on the parent stream indicating it has 2 children
    const childCountBadge = page
      .locator(`[data-test-subj="routingRule-${parentStream}"]`)
      .getByTestId('streamsAppRoutingRuleChildCountBadge');
    await expect(childCountBadge).toBeVisible();
    await expect(childCountBadge).toHaveText('+2');
  });
});
