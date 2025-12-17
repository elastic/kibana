/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout';
import { test, safeDeleteStream, cleanupTestStreams } from '../../../fixtures';

test.describe(
  'Stream data routing - reordering routing rules',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let streamNames: string[] = [];

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
      await browserAuth.loginAsAdmin();

      // Create unique stream names for this worker
      const workerSuffix = `w${testInfo.workerIndex}`;
      streamNames = [
        `logs.first-${workerSuffix}`,
        `logs.second-${workerSuffix}`,
        `logs.third-${workerSuffix}`,
      ];

      // Clean up and create test streams
      for (const streamName of streamNames) {
        await safeDeleteStream(apiServices, streamName);
        await apiServices.streams.forkStream('logs', streamName, {
          field: 'service.name',
          eq: streamName.split('.')[1],
        });
      }

      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterEach(async ({ apiServices }) => {
      await cleanupTestStreams(apiServices, streamNames);
    });

    test('should reorder routing rules via drag and drop', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(streamNames);

      await pageObjects.streams.dragRoutingRule(streamNames[0], 2);

      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder([
        streamNames[1],
        streamNames[2],
        streamNames[0],
      ]);
    });

    test('should cancel reordering', async ({ pageObjects }) => {
      await pageObjects.streams.expectRoutingOrder(streamNames);

      await pageObjects.streams.dragRoutingRule(streamNames[0], 2);

      await pageObjects.streams.cancelChanges();

      await pageObjects.streams.expectRoutingOrder(streamNames);
    });

    test('should handle multiple reorder operations', async ({ pageObjects }) => {
      // Perform drag operations
      await pageObjects.streams.dragRoutingRule(streamNames[0], 2);
      await pageObjects.streams.checkDraggingOver();

      // Perform another reorder while in reordering state
      await pageObjects.streams.dragRoutingRule(streamNames[2], -1);
      await pageObjects.streams.checkDraggingOver();

      // Save all changes
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      await pageObjects.streams.expectRoutingOrder([
        streamNames[2],
        streamNames[1],
        streamNames[0],
      ]);
    });

    test('should not allow editing while reordering is in progress', async ({
      page,
      pageObjects,
    }) => {
      // Start reordering
      await pageObjects.streams.dragRoutingRule(streamNames[0], 1);
      await pageObjects.streams.checkDraggingOver();

      // The entire UI should be in reordering mode
      const saveOrderButton = page.getByTestId('streamsAppManagementBottomBarButton');
      await expect(saveOrderButton).toBeVisible();

      // Edit buttons should not be interactive during reordering
      const editButton = page.getByTestId(`routingRuleEditButton-${streamNames[1]}`);
      await expect(editButton).toBeVisible();
      await expect(editButton).toBeDisabled();
    });

    test('should persist order after page refresh', async ({ page, pageObjects }) => {
      // Reorder rules
      await pageObjects.streams.dragRoutingRule(streamNames[0], 2);
      await pageObjects.streams.saveRuleOrder();
      await pageObjects.toasts.waitFor();

      // Refresh the page
      await page.reload();

      // Verify order persisted
      await pageObjects.streams.expectRoutingOrder([
        streamNames[1],
        streamNames[2],
        streamNames[0],
      ]);
    });

    test('should allow reordering only when multiple rules exist', async ({
      page,
      apiServices,
      pageObjects,
    }, testInfo) => {
      const workerSuffix = `w${testInfo.workerIndex}`;
      const singleStreamName = `logs.single-${workerSuffix}`;
      const secondStreamSuffix = `second-single-${workerSuffix}`;
      const secondStreamName = `logs.${secondStreamSuffix}`;

      // Clean up existing streams
      await cleanupTestStreams(apiServices, streamNames);
      streamNames = [singleStreamName]; // Reset for cleanup

      await safeDeleteStream(apiServices, singleStreamName);
      await apiServices.streams.forkStream('logs', singleStreamName, {
        field: 'service.name',
        eq: 'test',
      });

      await pageObjects.streams.gotoPartitioningTab('logs');

      // With single rule, the rule should be visible but reordering is not possible
      const singleRule = page.getByTestId(`routingRule-${singleStreamName}`);
      await expect(singleRule).toBeVisible();

      // Drag handle should NOT be visible with only one rule
      const dragHandleSingle = page.getByTestId(`routingRuleDragHandle-${singleStreamName}`);
      await expect(dragHandleSingle).toBeHidden();

      // Now add a second rule
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName(secondStreamSuffix);
      await pageObjects.streams.fillConditionEditor({
        field: 'severity_text',
        operator: 'equals',
        value: 'info',
      });
      await pageObjects.streams.saveRoutingRule();
      await pageObjects.toasts.closeAll();
      streamNames.push(secondStreamName);

      // With multiple rules, drag handles should be visible for both rules
      const dragHandleFirst = page.getByTestId(`routingRuleDragHandle-${singleStreamName}`);
      const dragHandleSecond = page.getByTestId(`routingRuleDragHandle-${secondStreamName}`);

      await expect(dragHandleFirst).toBeVisible();
      await expect(dragHandleSecond).toBeVisible();
    });
  }
);
