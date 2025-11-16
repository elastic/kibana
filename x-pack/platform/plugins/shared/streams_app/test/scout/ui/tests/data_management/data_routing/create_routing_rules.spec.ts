/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

test.describe('Stream data routing - creating routing rules', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('should create a new routing rule successfully', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Verify we're in the creating new rule state
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
    await expect(page.getByTestId('streamsAppRoutingStreamNameLabel')).toBeVisible();
    await expect(page.getByTestId('streamsAppRoutingStreamNamePrefix')).toContainText('logs.');

    // Fill in the stream name
    await page.getByTestId('streamsAppRoutingStreamEntryNameField').fill('nginx');

    // Set up routing condition
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      value: 'nginxlogs',
      operator: 'equals',
    });

    // Save the rule (fork stream)
    await page.getByTestId('streamsAppStreamDetailRoutingSaveButton').click();

    // Verify success
    await pageObjects.streams.expectRoutingRuleVisible('logs.nginx');
    const routingRule = page.getByTestId('routingRule-logs.nginx');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText(
      'nginxlogs'
    );
  });

  test('should cancel creating new routing rule', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Fill in some data
    await pageObjects.streams.fillRoutingRuleName('test');

    // Cancel the operation
    await pageObjects.streams.cancelRoutingRule();

    // Verify we're back to idle state
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeHidden();
  });

  test('should not let creating new routing rule while one is in progress', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    await expect(page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton')).toBeDisabled();

    // Cancel the operation
    await pageObjects.streams.cancelRoutingRule();

    // Verify we're back to idle state
    await expect(page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton')).toBeEnabled();
  });

  test('should show validation errors for invalid stream names', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Try invalid stream names
    const invalidNames = ['invalid name with spaces', 'UPPERCASE', 'special@chars'];

    for (const invalidName of invalidNames) {
      await pageObjects.streams.fillRoutingRuleName(invalidName);
      await pageObjects.streams.saveRoutingRule();

      // Wait for the error toast to appear
      await pageObjects.toasts.waitFor();

      // Should stay in creating state due to validation error
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
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
    const createButton = page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton');
    await expect(createButton).toBeHidden();
  });

  test('should not allow creating a routing rule that is not a child of the current stream', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Input invalid partition name that is not a direct child of the current stream
    await pageObjects.streams.fillRoutingRuleName('nginx.access_logs');

    const createButton = page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton');
    await expect(createButton).toBeDisabled();
  });

  test('should navigate to child stream when clicking on stream name link', async ({
    page,
    pageObjects,
  }) => {
    // Create a child stream first
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('navigation-test');
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      value: 'test',
      operator: 'equals',
    });
    await pageObjects.streams.saveRoutingRule();
    await pageObjects.toasts.closeAll();

    const streamLink = page
      .getByTestId('routingRule-logs.navigation-test')
      .getByTestId('streamsAppRoutingStreamEntryButton');
    await expect(streamLink).toBeVisible();
    await streamLink.click();

    // Verify we navigated to the child stream's partitioning tab
    await expect(page).toHaveURL(/logs\.navigation-test\/management\/partitioning/);
  });

  test('should show "Open stream in new tab" button in success toast', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('toast-test');
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      value: 'test',
      operator: 'equals',
    });
    await pageObjects.streams.saveRoutingRule();
    await pageObjects.toasts.waitFor();

    const openInNewTabButton = page.getByTestId(
      'streamsAppSaveOrUpdateChildrenOpenStreamInNewTabButton'
    );
    await expect(openInNewTabButton).toBeVisible();

    await expect(openInNewTabButton).toHaveAttribute(
      'href',
      expect.stringContaining('logs.toast-test')
    );
  });

  test('should handle complex AND/OR condition via syntax editor', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('complex-condition-test');
    await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();

    const complexCondition = {
      and: [
        {
          field: 'severity_text',
          eq: 'info',
        },
        {
          field: 'service.name',
          contains: 'web',
        },
      ],
    };

    await pageObjects.streams.fillConditionEditorWithSyntax(
      JSON.stringify(complexCondition, null, 2)
    );

    const codeEditor = page.getByTestId('streamsAppConditionEditorCodeEditor');
    await expect(codeEditor).toBeVisible();

    await pageObjects.streams.saveRoutingRule();
    await pageObjects.toasts.waitFor();

    await pageObjects.streams.expectRoutingRuleVisible('logs.complex-condition-test');
  });

  test('should show error for invalid JSON in syntax editor', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('invalid-json-test');
    await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();

    // Enter invalid JSON
    const codeEditor = page.getByTestId('streamsAppConditionEditorCodeEditor');
    await codeEditor.click();
    await page.keyboard.type('{ invalid json }');

    await pageObjects.streams.saveRoutingRule();

    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
  });

  test('should show complex condition in syntax editor', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    try {
      await apiServices.streams.clearStreamChildren('logs');
    } catch {
      // Ignore 409 errors if streams can't be cleared
    }

    const complexCondition = {
      or: [
        { field: 'severity_text', eq: 'error' },
        { field: 'severity_text', eq: 'critical' },
      ],
    };

    await apiServices.streams.forkStream('logs', 'logs.complex-ui-test', complexCondition);

    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.streams.clickEditRoutingRule('logs.complex-ui-test');

    const syntaxSwitch = page.getByTestId('streamsAppConditionEditorSwitch');
    await expect(syntaxSwitch).toBeVisible();

    const codeEditor = page.getByTestId('streamsAppConditionEditorCodeEditor');
    await expect(codeEditor).toBeVisible();

    await expect(codeEditor).toContainText('"or": [');
  });

  test('should attempt to create stream with duplicate name and fail', async ({
    page,
    pageObjects,
  }) => {
    // Create first rule
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('duplicate-test');
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'equals',
      value: 'test',
    });
    await pageObjects.streams.saveRoutingRule();
    await pageObjects.toasts.closeAll();

    // Verify first rule was created
    await pageObjects.streams.expectRoutingRuleVisible('logs.duplicate-test');

    // Try to create another with same name
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('duplicate-test');
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'equals',
      value: 'different',
    });
    await pageObjects.streams.saveRoutingRule();

    // Should show error toast
    await pageObjects.toasts.waitFor();

    // Should stay in creating state due to error
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
  });

  test('should validate stream names with consecutive dots', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Try name with consecutive dots
    await pageObjects.streams.fillRoutingRuleName('test..invalid');

    // Add a condition to enable save button
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'equals',
      value: 'test',
    });

    // Try to save - button should be disabled due to validation
    const saveButton = page.getByTestId('streamsAppStreamDetailRoutingSaveButton');
    await expect(saveButton).toBeDisabled();
  });

  test('should validate stream names starting with dots', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    await pageObjects.streams.fillRoutingRuleName('.invalid');

    // Add a condition to enable save button
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'equals',
      value: 'test',
    });

    // Try to save - button should be disabled due to validation
    const saveButton = page.getByTestId('streamsAppStreamDetailRoutingSaveButton');
    await expect(saveButton).toBeDisabled();
  });

  test('should validate stream names ending with dots', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    await pageObjects.streams.fillRoutingRuleName('invalid.');

    // Add a condition to enable save button
    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'equals',
      value: 'test',
    });

    // Try to save - button should be disabled due to validation
    const saveButton = page.getByTestId('streamsAppStreamDetailRoutingSaveButton');
    await expect(saveButton).toBeDisabled();
  });
});
