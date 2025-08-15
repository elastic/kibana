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
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.enable();
    // Generate logs data only
    await logsSynthtraceEsClient.clean();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    // Clear synthtrace data
    await logsSynthtraceEsClient.clean();
    await apiServices.streams.disable();
  });

  test('should show preview during rule creation', async ({ pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('logs.preview-test');

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
    await pageObjects.streams.fillRoutingRuleName('logs.preview-test');

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
    await pageObjects.streams.fillRoutingRuleName('logs.preview-test');

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
    await pageObjects.streams.fillRoutingRuleName('logs.no-matches');

    // Set condition that won't match anything
    await pageObjects.streams.fillConditionEditor({
      field: 'nonexistent.field',
      value: 'nonexistent-value',
      operator: 'equals',
    });

    // Should show no matching documents
    await expect(page.getByText('No documents to preview')).toBeVisible();
  });
});
