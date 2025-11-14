/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { test } from '../../../fixtures';

test.describe(
  'Stream data routing - reordering routing rules',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.enable();
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create multiple test streams for reordering
      const streamNames = ['logs.first', 'logs.second', 'logs.third'];
      for (const streamName of streamNames) {
        await apiServices.streams.forkStream('logs', streamName, {
          field: 'service.name',
          eq: streamName.split('.')[1],
        });
      }

      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      await apiServices.streams.disable();
    });

    test('should reorder routing rules via drag and drop', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);

      await pageObjects.streams.dragRoutingRule('logs.first', 2);

      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder(['logs.second', 'logs.third', 'logs.first']);
    });

    test('should cancel reordering', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);

      await pageObjects.streams.dragRoutingRule('logs.first', 2);

      await pageObjects.streams.cancelChanges();

      await pageObjects.streams.expectRoutingOrder(['logs.first', 'logs.second', 'logs.third']);
    });

    test('should handle multiple reorder operations', async ({ pageObjects }) => {
      // Perform drag operations
      await pageObjects.streams.dragRoutingRule('logs.first', 2);
      await pageObjects.streams.checkDraggingOver();

      // Perform another reorder while in reordering state
      await pageObjects.streams.dragRoutingRule('logs.third', -1);
      await pageObjects.streams.checkDraggingOver();

      // Save all changes
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder(['logs.third', 'logs.second', 'logs.first']);
    });
  }
);
