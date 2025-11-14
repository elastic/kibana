/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

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
  });

  test.afterAll(async ({ logsSynthtraceEsClient }) => {
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

  test('should allow updating the condition manually by syntax editor', async ({ pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('preview-test');

    // Enable syntax editor
    await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();
    // Set condition that should match the test data
    await pageObjects.streams.fillConditionEditorWithSyntax(
      JSON.stringify(
        {
          field: 'severity_text',
          eq: 'info',
        },
        null,
        2
      )
    );

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
    await pageObjects.streams.fillConditionEditorWithSyntax(
      JSON.stringify(
        {
          and: [
            {
              field: 'severity_text',
              eq: 'warn',
            },
            {
              field: 'body.text',
              contains: 'log',
            },
          ],
        },
        null,
        2
      )
    );

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
    await expect(page.getByText('No documents to preview')).toBeVisible();
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

  // This test is failing in Cloud run even with improved cleanup b/w test spec files
  // See https://github.com/elastic/kibana/issues/242931
  test.skip('should switch between matched and unmatched documents', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('filter-switch-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'equals',
      value: 'info',
    });

    await pageObjects.streams.expectPreviewPanelVisible();
    const initialRows = await pageObjects.streams.getPreviewTableRows();

    // Verify all initial rows match the condition
    for (let rowIndex = 0; rowIndex < initialRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'severity_text',
        rowIndex,
        value: 'info',
      });
    }

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toContainText('50%');
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toContainText('50%');

    await page.getByTestId('routingPreviewUnmatchedFilterButton').click();

    await pageObjects.streams.expectPreviewPanelVisible();

    // Verify unmatched filter is now selected
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Verify unmatched documents are shown (should not contain 'info')
    const unmatchedRows = await pageObjects.streams.getPreviewTableRows();
    for (let rowIndex = 0; rowIndex < unmatchedRows.length; rowIndex++) {
      await pageObjects.streams.expectCellValueContains({
        columnName: 'severity_text',
        rowIndex,
        value: 'info',
        invertCondition: true,
      });
    }
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

  test('should handle filter controls with complex conditions', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('complex-filter-test');

    // Enable syntax editor and set complex condition
    await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();
    await pageObjects.streams.fillConditionEditorWithSyntax(
      JSON.stringify(
        {
          and: [
            {
              field: 'severity_text',
              eq: 'info',
            },
            {
              field: 'body.text',
              contains: 'will never match',
            },
          ],
        },
        null,
        2
      )
    );

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toContainText('0%');
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toContainText('100%');
  });

  test('should disable filter controls when no condition is set', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('no-condition-test');

    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toBeDisabled();
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toBeDisabled();
  });

  test('should show filter tooltip', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    const tooltipIcon = page.getByTestId('routingPreviewFilterControlsTooltip');
    await expect(tooltipIcon).toBeVisible();
  });

  test('should handle error states', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('error-test');

    // Set a condition that might cause issues without field
    await pageObjects.streams.fillConditionEditor({
      operator: 'equals',
      value: 'info',
    });

    // Verify filter controls are present and disabled
    await expect(page.getByTestId('routingPreviewMatchedFilterButton')).toBeDisabled();
    await expect(page.getByTestId('routingPreviewUnmatchedFilterButton')).toBeDisabled();
  });
});
