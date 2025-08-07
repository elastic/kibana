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
    await page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton').click();

    // Verify we're in the creating new rule state
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
    await expect(page.getByText('Stream name')).toBeVisible();

    // Fill in the stream name
    await page.getByTestId('streamsAppRoutingStreamEntryNameField').fill('logs.nginx');

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
      await pageObjects.streams.expectToastVisible();

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
});
