/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

test.describe(
  'Stream data routing - error handling and recovery',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
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
      await pageObjects.streams.fillRoutingRuleName('network-test');

      // Simulate network failure
      await context.setOffline(true);

      await pageObjects.streams.saveRoutingRule();

      // Should show error and stay in creating state
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getMessageText()).toBe('Failed to fetch');
      await pageObjects.toasts.closeAll();
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();

      // Restore network and retry
      await context.setOffline(false);
      await pageObjects.streams.saveRoutingRule();

      // Should succeed
      await pageObjects.streams.expectRoutingRuleVisible('logs.network-test');
    });

    test('should recover from API errors during rule updates', async ({ context, pageObjects }) => {
      // Create a rule first
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('error-test');
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.toasts.closeAll();

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule('logs.error-test');

      // Simulate network failure
      await context.setOffline(true);

      await pageObjects.streams.updateRoutingRule();

      // Should show error and return to editing state
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getMessageText()).toBe('Failed to fetch');
      await pageObjects.toasts.closeAll();

      // Restore network and retry
      await context.setOffline(false);
      await pageObjects.streams.updateRoutingRule();

      // Should succeed
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toBe('Stream saved');
    });
  }
);
