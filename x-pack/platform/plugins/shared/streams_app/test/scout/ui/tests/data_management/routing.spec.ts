/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

/* eslint-disable playwright/max-nested-describe */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../fixtures/generators';

test.describe('Stream Detail Routing', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test.describe('Creating New Routing Rules', () => {
    test.beforeEach(async ({ pageObjects }) => {
      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test('should create a new routing rule successfully', async ({ page, pageObjects }) => {
      await page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton').click();

      // Verify we're in the creating new rule state
      await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeVisible();
      await expect(page.getByText('Stream name')).toBeVisible();

      // Fill in the stream name
      await page.testSubj.locator('streamsAppRoutingStreamEntryNameField').fill('logs.nginx');

      // Set up routing condition
      await pageObjects.streams.fillConditionEditor({
        field: 'service.name',
        value: 'nginx',
        operator: 'equals',
      });

      // Save the rule (fork stream)
      await page.getByRole('button', { name: 'Save' }).click();

      // Verify success
      await pageObjects.streams.expectRoutingRuleVisible('logs.nginx');
      await expect(page.getByText('service.name eq nginx')).toBeVisible();
    });

    test('should cancel creating new routing rule', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickCreateRoutingRule();

      // Fill in some data
      await pageObjects.streams.fillRoutingRuleName('logs.test');

      // Cancel the operation
      await pageObjects.streams.cancelRoutingRule();

      // Verify we're back to idle state
      await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeHidden();
    });

    test('should not let creating new routing rule while one is in progress', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickCreateRoutingRule();

      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeDisabled();

      // Cancel the operation
      await pageObjects.streams.cancelRoutingRule();

      // Verify we're back to idle state
      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeEnabled();
    });

    test('should show validation errors for invalid stream names', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickCreateRoutingRule();

      // Try invalid stream names
      const invalidNames = ['invalid name with spaces', 'UPPERCASE', 'special@chars'];

      for (const invalidName of invalidNames) {
        await pageObjects.streams.fillRoutingRuleName(invalidName);
        await pageObjects.streams.saveRoutingRule();

        // Wait for the error toast to appear
        await pageObjects.streams.expectToastVisible();

        // Should stay in creating state due to validation error
        await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeVisible();
      }
    });

    test('should handle insufficient privileges gracefully', async ({
      page,
      browserAuth,
      pageObjects,
    }) => {
      // Login as user with limited privileges
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoPartitioningTab('logs');

      // Create button should be disabled or show tooltip
      const createButton = page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton');
      await expect(createButton).toBeHidden();
    });
  });

  test.describe('Editing Existing Routing Rules', () => {
    test.beforeEach(async ({ apiServices, pageObjects }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs', 'logs.edit-test', {
        field: 'service.name',
        value: 'test-service',
        operator: 'eq',
      });

      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
    });

    test('should edit an existing routing rule', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      // Update condition
      await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
      await pageObjects.streams.updateRoutingRule();

      // Verify success
      await expect(page.getByText('service.name eq updated-service')).toBeVisible();
    });

    test('should cancel editing routing rule', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      // Update and cancel changes
      await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
      await pageObjects.streams.cancelRoutingRule();

      // Verify success
      await expect(page.getByText('service.name eq test-service')).toBeVisible();
    });

    test('should switch between editing different rules', async ({ page, pageObjects }) => {
      // Create another test rule
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.edit-test-2');
      await pageObjects.streams.fillConditionEditor({
        field: 'log.level',
        value: 'info',
        operator: 'equals',
      });
      await pageObjects.streams.saveRoutingRule();

      // Edit first rule
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      // Switch to edit second rule without saving
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test-2');

      // Should now be editing the second rule
      await expect(page.testSubj.locator('streamsAppConditionEditorValueText')).toHaveValue('info');
    });

    test('should remove routing rule with confirmation', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      await pageObjects.streams.removeRoutingRule();

      // Confirm deletion in modal
      await pageObjects.streams.confirmDeleteInModal();

      await pageObjects.streams.expectRoutingRuleHidden('logs.edit-test');
      await pageObjects.streams.expectToastVisible();
    });

    test('should cancel rule removal', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');
      await pageObjects.streams.removeRoutingRule();

      // Cancel deletion
      await pageObjects.streams.cancelDeleteInModal();

      // Verify rule still exists
      await pageObjects.streams.expectRoutingRuleVisible('logs.edit-test');
    });
  });

  test.describe('Reordering Routing Rules', () => {
    test.beforeEach(async ({ pageObjects, apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create multiple test streams for reordering
      const streamNames = ['logs.first', 'logs.second', 'logs.third'];
      for (const streamName of streamNames) {
        await apiServices.streams.forkStream('logs', streamName, {
          field: 'service.name',
          value: streamName.split('.')[1],
          operator: 'eq',
        });
      }

      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
    });

    test('should reorder routing rules via drag and drop', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);

      await pageObjects.streams.dragRoutingRule('logs.first', 2);

      await pageObjects.streams.saveRuleOrder();
      await pageObjects.streams.expectToastVisible();

      await pageObjects.streams.expectRoutingOrder(['logs.second', 'logs.third', 'logs.first']);
    });

    test('should cancel reordering', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);

      await pageObjects.streams.dragRoutingRule('logs.first', 2);

      await pageObjects.streams.cancelRuleOrder();

      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);
    });

    test('should handle multiple reorder operations', async ({ pageObjects }) => {
      // Perform drag operations
      await pageObjects.streams.dragRoutingRule('logs.first', 2);
      // Perform another reorder while in reordering state
      await pageObjects.streams.dragRoutingRule('logs.third', -1);

      // Save all changes
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.streams.expectToastVisible();

      await pageObjects.streams.expectRoutingOrder(['logs.third', 'logs.second', 'logs.first']);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test.beforeEach(async ({ pageObjects }) => {
      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
    });

    test('should handle network failures during rule creation', async ({
      page,
      context,
      pageObjects,
    }) => {
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.network-test');

      // Simulate network failure
      await context.setOffline(true);

      await pageObjects.streams.saveRoutingRule();

      // Should show error and stay in creating state
      await pageObjects.streams.expectToastVisible();
      await expect(page.getByText('Failed to fetch')).toBeVisible();
      await pageObjects.streams.closeToast();
      await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeVisible();

      // Restore network and retry
      await context.setOffline(false);
      await pageObjects.streams.saveRoutingRule();

      // Should succeed
      await pageObjects.streams.expectRoutingRuleVisible('logs.network-test');
    });

    test('should recover from API errors during rule updates', async ({
      context,
      page,
      pageObjects,
    }) => {
      // Create a rule first
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.error-test');
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.streams.closeToast();

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule('logs.error-test');

      // Simulate network failure
      await context.setOffline(true);

      await pageObjects.streams.updateRoutingRule();

      // Should show error and return to editing state
      await pageObjects.streams.expectToastVisible();
      await expect(page.getByText('Failed to fetch')).toBeVisible();
      await pageObjects.streams.closeToast();

      // Restore network and retry
      await context.setOffline(false);
      await pageObjects.streams.updateRoutingRule();

      // Should succeed
      await pageObjects.streams.expectToastVisible();
      await expect(page.getByText('Stream saved')).toBeVisible();
    });
  });

  test.describe('Preview Panel Integration', () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      // Generate logs data only
      await generateLogsData(logsSynthtraceEsClient);
    });

    test.beforeEach(async ({ pageObjects }) => {
      await pageObjects.streams.gotoPartitioningTab('logs');
      await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
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
        await pageObjects.streams.expectCellValue({
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
        await pageObjects.streams.expectCellValue({
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
        await pageObjects.streams.expectCellValue({
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
});
