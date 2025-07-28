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

  test.describe.only('Editing Existing Routing Rules', () => {
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
    test.beforeEach(async ({ pageObjects, page }) => {
      // Create multiple test streams for reordering
      const streamNames = ['logs.first', 'logs.second', 'logs.third'];

      for (const streamName of streamNames) {
        await pageObjects.streams.clickCreateRoutingRule();
        await pageObjects.streams.fillRoutingRuleName(streamName);
        await pageObjects.streams.fillConditionEditor({
          field: 'service.name',
          value: streamName.split('.')[1],
          operator: 'equals',
        });
        await pageObjects.streams.saveRoutingRule();
        await pageObjects.streams.closeToast();
      }
    });

    test('should reorder routing rules via drag and drop', async ({ page, pageObjects }) => {
      // Verify initial order
      await pageObjects.streams.expectRoutingRuleVisible('logs.first');

      // Start reordering - State: idle → reorderingRules
      await pageObjects.streams.dragRoutingRule('logs.first', 'logs.third');

      // Verify reorder controls appear
      await expect(page.getByRole('button', { name: 'Save order' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

      // Save the new order - State: reorderingRules.reordering → reorderingRules.updatingStream
      await pageObjects.streams.saveRuleOrder();

      // Verify new order is saved - State: updatingStream → idle
      await pageObjects.streams.expectToastVisible();
      // Note: Detailed order verification would need specific data-testid for position
    });

    test('should cancel reordering', async ({ page, pageObjects }) => {
      // Start reordering
      await pageObjects.streams.dragRoutingRule('logs.first', 'logs.second');

      // Cancel reordering - State: reorderingRules → idle
      await pageObjects.streams.cancelRuleOrder();

      // Verify original order is maintained
      await pageObjects.streams.expectRoutingRuleVisible('logs.first');

      // Reorder controls should be hidden
      await expect(page.getByRole('button', { name: 'Save order' })).toBeHidden();
    });

    test('should handle multiple reorder operations', async ({ page, pageObjects }) => {
      // Perform multiple drag operations
      await pageObjects.streams.dragRoutingRule('logs.first', 'logs.second');

      // Perform another reorder while in reordering state
      await pageObjects.streams.dragRoutingRule('logs.third', 'logs.first');

      // Save all changes
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.streams.expectToastVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
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
      await expect(page.getByText('Network error')).toBeVisible();
      await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeVisible();

      // Restore network and retry
      await context.setOffline(false);
      await page.getByRole('button', { name: 'Save' }).click();

      // Should succeed
      await expect(page.getByRole('link', { name: 'logs.network-test' })).toBeVisible();
    });

    test('should recover from API errors during rule updates', async ({ page, pageObjects }) => {
      // Create a rule first
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.error-test');
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.streams.closeToast();

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule('logs.error-test');

      // Mock API error response
      await page.route('**/api/streams/**', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await pageObjects.streams.updateRoutingRule();

      // Should show error and return to editing state
      await expect(page.getByText('Failed to update')).toBeVisible();
      await pageObjects.streams.expectStreamNameFieldVisible();

      // Unblock API and retry
      await page.unroute('**/api/streams/**');
      await pageObjects.streams.updateRoutingRule();

      // Should succeed
      await pageObjects.streams.expectToastVisible();
    });

    test('should maintain state consistency during errors', async ({ page, pageObjects }) => {
      // Start creating a rule
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.consistency-test');

      // Simulate page refresh during creation
      await page.reload();

      // Should return to clean idle state
      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeVisible();
      await expect(page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeHidden();
    });
  });

  test.describe('State Machine Transitions', () => {
    test('should follow correct state transitions for successful rule creation', async ({
      page,
      pageObjects,
    }) => {
      // Initial state: ready.idle
      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeVisible();

      // Transition: idle → creatingNewRule.changing
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.expectStreamNameFieldVisible();

      // Fill required fields
      await pageObjects.streams.fillRoutingRuleName('logs.state-test');

      // Transition: creatingNewRule.changing → creatingNewRule.forking
      await pageObjects.streams.saveRoutingRule();

      // Should show loading state briefly
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

      // Transition: creatingNewRule.forking → idle (on success)
      await pageObjects.streams.expectRoutingRuleVisible('logs.state-test');
      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeVisible();
    });

    test('should follow correct state transitions for rule editing', async ({
      page,
      pageObjects,
    }) => {
      // Setup: Create a rule to edit
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.state-edit-test');
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.streams.closeToast();

      // Initial state: idle
      await expect(
        page.testSubj.locator('routingRuleEditButton-logs.state-edit-test')
      ).toBeVisible();

      // Transition: idle → editingRule.changing
      await pageObjects.streams.clickEditRoutingRule('logs.state-edit-test');
      await pageObjects.streams.expectStreamNameFieldVisible();

      // Modify the rule
      await pageObjects.streams.fillRoutingRuleName('logs.state-edit-test-updated');

      // Transition: editingRule.changing → editingRule.updatingRule
      await pageObjects.streams.updateRoutingRule();

      // Should show loading state
      await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled();

      // Transition: editingRule.updatingRule → idle (on success)
      await pageObjects.streams.expectRoutingRuleVisible('logs.state-edit-test-updated');
    });

    test('should handle state transitions during rule removal', async ({ page, pageObjects }) => {
      // Setup
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.state-remove-test');
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.streams.closeToast();

      await pageObjects.streams.clickEditRoutingRule('logs.state-remove-test');

      await pageObjects.streams.removeRoutingRule();
      await expect(page.getByText('Delete stream')).toBeVisible();

      // Confirm deletion
      await pageObjects.streams.confirmDeleteInModal();

      // Should show loading state then return to idle
      await pageObjects.streams.expectRoutingRuleHidden('logs.state-remove-test');
      await expect(
        page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton')
      ).toBeVisible();
    });
  });

  test.describe('Preview Panel Integration', () => {
    test('should show preview during rule creation', async ({ page, esClient, pageObjects }) => {
      // Insert test data for preview
      await esClient.index({
        index: 'logs',
        document: {
          '@timestamp': new Date().toISOString(),
          'service.name': 'nginx',
          'log.level': 'error',
          message: 'Test log message',
        },
      });
      await esClient.indices.refresh({ index: 'logs' });

      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.preview-test');

      // Set condition that should match the test data
      await pageObjects.streams.fillConditionEditor({
        field: 'service.name',
        value: 'nginx',
        operator: 'equals',
      });

      // Verify preview panel shows matching documents
      await pageObjects.streams.expectPreviewPanelVisible();
      await expect(page.getByText('1 matching document')).toBeVisible();
      await expect(page.getByText('Test log message')).toBeVisible();
    });

    test('should update preview when condition changes', async ({
      page,
      esClient,
      pageObjects,
    }) => {
      // Insert varied test data
      const testDocs = [
        { 'service.name': 'nginx', 'log.level': 'error' },
        { 'service.name': 'apache', 'log.level': 'error' },
        { 'service.name': 'nginx', 'log.level': 'info' },
      ];

      for (const doc of testDocs) {
        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': new Date().toISOString(),
            ...doc,
            message: `Test message for ${doc['service.name']}`,
          },
        });
      }
      await esClient.indices.refresh({ index: 'logs' });

      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('logs.dynamic-preview');

      // Set initial condition
      await pageObjects.streams.fillConditionEditor({
        field: 'service.name',
        value: 'nginx',
        operator: 'equals',
      });

      // Should show 2 matching documents (nginx with error and info)
      await expect(page.getByText('2 matching documents')).toBeVisible();

      // Change condition to be more specific by updating the value
      await pageObjects.streams.fillConditionEditor({
        field: 'log.level',
        value: 'error',
        operator: 'equals',
      });

      // Should now show 1 matching document (nginx with error only)
      await expect(page.getByText('1 matching document')).toBeVisible();
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
      await expect(page.getByText('No matching documents')).toBeVisible();
    });
  });
});
