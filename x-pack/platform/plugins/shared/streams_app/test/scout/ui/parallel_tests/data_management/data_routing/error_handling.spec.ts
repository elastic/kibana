/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import {
  test,
  cleanupTestStreams,
} from '../../../fixtures';

test.describe(
  'Stream data routing - error handling and recovery',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let createdStreams: string[] = [];

    test.beforeEach(async ({ browserAuth, pageObjects }, testInfo) => {
      await browserAuth.loginAsAdmin();
      createdStreams = [];
      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterEach(async ({ apiServices }) => {
      await cleanupTestStreams(apiServices, createdStreams);
    });

    test('should handle network failures during rule creation', async ({
      page,
      context,
      pageObjects,
    }, testInfo) => {
      const streamSuffix = `network-test-w${testInfo.workerIndex}`;
      const fullStreamName = `logs.${streamSuffix}`;

      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName(streamSuffix);

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
      await pageObjects.streams.expectRoutingRuleVisible(fullStreamName);
      createdStreams.push(fullStreamName);
    });

    test('should recover from API errors during rule updates', async ({ context, pageObjects }, testInfo) => {
      const streamSuffix = `error-test-w${testInfo.workerIndex}`;
      const fullStreamName = `logs.${streamSuffix}`;

      // Create a rule first
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName(streamSuffix);
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.toasts.closeAll();
      createdStreams.push(fullStreamName);

      // Edit the rule
      await pageObjects.streams.clickEditRoutingRule(fullStreamName);

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
