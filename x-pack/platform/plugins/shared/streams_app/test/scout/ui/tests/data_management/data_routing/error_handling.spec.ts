/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/236644
test.describe.skip(
  'Stream data routing - error handling and recovery',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.enable();
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      await apiServices.streams.disable();
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
      await pageObjects.streams.closeToasts();
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();

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
      await pageObjects.streams.closeToasts();

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule('logs.error-test');

      // Simulate network failure
      await context.setOffline(true);

      await pageObjects.streams.updateRoutingRule();

      // Should show error and return to editing state
      await pageObjects.streams.expectToastVisible();
      await expect(page.getByText('Failed to fetch')).toBeVisible();
      await pageObjects.streams.closeToasts();

      // Restore network and retry
      await context.setOffline(false);
      await pageObjects.streams.updateRoutingRule();

      // Should succeed
      await pageObjects.streams.expectToastVisible();
      await expect(page.getByText('Stream saved')).toBeVisible();
    });
  }
);
