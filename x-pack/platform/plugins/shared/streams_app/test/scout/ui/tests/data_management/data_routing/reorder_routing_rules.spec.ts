/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';

// Note: Routing rule reordering API correctness is covered by
// API tests in x-pack/platform/plugins/shared/streams/test/scout/api/tests/routing_fork_stream.spec.ts
// These UI tests focus on the user experience: drag and drop, cancel flows, UI state during reordering, and persistence verification
test.describe(
  'Stream data routing - reordering routing rules',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs.otel');
      // Create multiple test streams for reordering
      const streamNames = ['logs.otel.first', 'logs.otel.second', 'logs.otel.third'];
      for (const streamName of streamNames) {
        await apiServices.streams.forkStream('logs.otel', streamName, {
          field: 'service.name',
          eq: streamName.split('.')[2],
        });
      }

      await pageObjects.streams.gotoPartitioningTab('logs.otel');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs.otel');
    });

    test('should reorder routing rules via drag and drop', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.first',
        'logs.otel.second',
        'logs.otel.third',
      ]);

      await pageObjects.streams.dragRoutingRule('logs.otel.first', 2);

      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.second',
        'logs.otel.third',
        'logs.otel.first',
      ]);
    });

    test('should cancel reordering', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.first',
        'logs.otel.second',
        'logs.otel.third',
      ]);

      await pageObjects.streams.dragRoutingRule('logs.otel.first', 2);

      await pageObjects.streams.cancelChanges();

      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.first',
        'logs.otel.second',
        'logs.otel.third',
      ]);
    });

    test('should handle multiple reorder operations', async ({ pageObjects }) => {
      // Perform drag operations
      await pageObjects.streams.dragRoutingRule('logs.otel.first', 2);
      await pageObjects.streams.checkDraggingOver();

      // Perform another reorder while in reordering state
      await pageObjects.streams.dragRoutingRule('logs.otel.third', -1);
      await pageObjects.streams.checkDraggingOver();

      // Save all changes
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.third',
        'logs.otel.second',
        'logs.otel.first',
      ]);
    });

    test('should not allow editing while reordering is in progress', async ({
      page,
      pageObjects,
    }) => {
      // Start reordering
      await pageObjects.streams.dragRoutingRule('logs.otel.first', 1);
      await pageObjects.streams.checkDraggingOver();

      // The entire UI should be in reordering mode
      const saveOrderButton = page.getByTestId('streamsAppManagementBottomBarButton');
      await expect(saveOrderButton).toBeVisible();

      // Edit buttons should not be interactive during reordering
      const editButton = page.getByTestId('routingRuleEditButton-logs.otel.second');
      await expect(editButton).toBeVisible();
      await expect(editButton).toBeDisabled();
    });

    test('should persist order after page refresh', async ({ page, pageObjects }) => {
      // Reorder rules
      await pageObjects.streams.dragRoutingRule('logs.otel.first', 2);
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      // Refresh the page
      await page.reload();

      // Verify order persisted
      await pageObjects.streams.expectRoutingOrder([
        'logs.otel.second',
        'logs.otel.third',
        'logs.otel.first',
      ]);
    });

    test('should allow reordering only when multiple rules exist', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      // Clear to have only one rule
      await apiServices.streams.clearStreamChildren('logs.otel');
      await apiServices.streams.forkStream('logs.otel', 'logs.otel.single', {
        field: 'service.name',
        eq: 'test',
      });

      await pageObjects.streams.gotoPartitioningTab('logs.otel');

      // With single rule, the rule should be visible but reordering is not possible
      const singleRule = page.getByTestId('routingRule-logs.otel.single');
      await expect(singleRule).toBeVisible();

      // Drag handle should NOT be visible with only one rule
      const dragHandleSingle = page.getByTestId('routingRuleDragHandle-logs.otel.single');
      await expect(dragHandleSingle).toBeHidden();

      // Now add a second rule
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('second');
      await pageObjects.streams.fillConditionEditor({
        field: 'severity_text',
        operator: 'equals',
        value: 'info',
      });
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.toasts.closeAll();

      // With multiple rules, drag handles should be visible for both rules
      const dragHandleFirst = page.getByTestId('routingRuleDragHandle-logs.otel.single');
      const dragHandleSecond = page.getByTestId('routingRuleDragHandle-logs.otel.second');

      await expect(dragHandleFirst).toBeVisible();
      await expect(dragHandleSecond).toBeVisible();
    });
  }
);
