/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe(
  'Stream data routing - error handling and recovery',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoPartitioningTab('logs.otel');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs.otel');
    });

    test('should handle network failures during rule creation', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('network-test');

      // Simulate a network failure for the fork request
      await page.route('**/api/streams/**/_fork*', (route) => route.abort('failed'));

      await pageObjects.streams.saveRoutingRule();

      // Should show error and stay in creating state
      await expect(page.getByTestId('errorToast')).toContainText('Failed to save');
      await pageObjects.toasts.dismissAll();
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();

      // Restore network and retry
      await page.unroute('**/api/streams/**/_fork*');
      await pageObjects.streams.saveRoutingRule();

      // Should succeed
      await pageObjects.streams.expectRoutingRuleVisible('logs.otel.network-test');
    });

    test('should recover from API errors during rule updates', async ({ page, pageObjects }) => {
      // Create a rule first with a field condition (not the default "always" condition)
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('error-test');
      await pageObjects.streams.fillConditionEditor({
        field: 'log.level',
        value: 'error',
        operator: 'equals',
      });
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.toasts.dismissAll();

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule('logs.otel.error-test');

      // Make a change to enable the Update button (hasRoutingChanges guard)
      await pageObjects.streams.fillConditionEditor({ value: 'info' });

      // Simulate a network failure for the ingest update request
      await page.route('**/api/streams/**/_ingest*', (route) => route.abort('failed'));

      await pageObjects.streams.updateRoutingRule();

      // Should show error and return to editing state
      await expect(page.getByTestId('errorToast')).toContainText('Failed to save');
      await pageObjects.toasts.dismissAll();

      // Restore network and retry
      await page.unroute('**/api/streams/**/_ingest*');
      await pageObjects.streams.updateRoutingRule();

      // Should succeed
      await expect(
        page
          .getByTestId('routingRule-logs.otel.error-test')
          .getByTestId('streamsAppConditionDisplayValue')
      ).toContainText('info');
    });

    test('should show server error message in Full error modal', async ({ page, pageObjects }) => {
      const serverErrorMessage = 'Stream name contains invalid characters: must be lowercase';

      // Intercept the fork stream API endpoint and return an error with a specific message
      await page.route('**/api/streams/**/_fork*', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            error: 'Bad Request',
            message: serverErrorMessage,
          }),
        });
      });

      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('test-error-modal');
      await pageObjects.streams.saveRoutingRule();

      // Wait for the error toast
      await pageObjects.toasts.waitFor();

      // Click "See the full error" button
      const fullErrorButton = page.getByTestId('errorToastBtn');
      await expect(fullErrorButton).toBeVisible();
      await fullErrorButton.click();

      // Verify the modal shows the server error message
      const errorModalBody = page.getByTestId('errorModalBody');
      await expect(errorModalBody).toBeVisible();
      await expect(errorModalBody).toContainText(serverErrorMessage);

      // Close the modal
      await page.getByRole('button', { name: 'Close', exact: true }).click();

      // Restore normal API behavior
      await page.unroute('**/api/streams/**/_fork*');
    });
  }
);
