/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

const MAX_STREAM_NAME_LENGTH = 200;

test.describe('Stream data routing - creating routing rules', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
  });

  test.afterEach(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
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

    await pageObjects.streams.cancelRoutingRule();

    await expect(page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton')).toBeEnabled();
  });

  interface ClientSideInvalidNameTestCases {
    streamName: string;
    expectedError: string;
  }

  test('should show validation errors for invalid stream names verified on the client', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Try invalid stream names
    const invalidNames: ClientSideInvalidNameTestCases[] = [
      {
        streamName: '',
        expectedError: 'Stream name is required.',
      },
      {
        streamName: 'a'.repeat(MAX_STREAM_NAME_LENGTH + 1),
        expectedError: 'Stream name cannot be longer than 200 characters.',
      },
      {
        streamName: 'UppercaseName',
        expectedError: 'Stream name cannot contain uppercase characters.',
      },
      {
        streamName: 'invalid name with spaces',
        expectedError: 'Stream name cannot contain spaces.',
      },
    ];

    for (const invalidName of invalidNames) {
      await pageObjects.streams.fillRoutingRuleName(invalidName.streamName);
      await expect(page.getByText(invalidName.expectedError)).toBeVisible();
    }
  });

  test('should show validation errors for invalid stream names verified on the server', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Try invalid stream names (these pass client-side validation but fail server-side)
    const invalidNames = ['special>chars'];

    for (const invalidName of invalidNames) {
      await pageObjects.streams.fillRoutingRuleName(invalidName);
      await pageObjects.streams.saveRoutingRule();

      // Wait for the error toast to appear
      await pageObjects.toasts.waitFor();

      // Should stay in creating state due to validation error
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
      await pageObjects.toasts.closeAll();
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

    await expect(pageObjects.streams.saveRoutingRuleButton).toBeDisabled();
    await expect(page.getByText('A stream with this name already exists')).toBeVisible();

    // Should stay in creating state due to error
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
  });
});
