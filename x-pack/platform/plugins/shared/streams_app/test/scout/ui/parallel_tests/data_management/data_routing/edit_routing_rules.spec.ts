/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Assertions are performed by re-using the streams_app fixtures and page objects. */
/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout';
import {
  test,
  getUniqueStreamName,
  safeDeleteStream,
  cleanupTestStreams,
} from '../../../fixtures';

test.describe('Stream data routing - editing routing rules', { tag: ['@ess', '@svlOblt'] }, () => {
  let testStreamName: string;
  let createdStreams: string[] = [];

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
    await browserAuth.loginAsAdmin();
    createdStreams = [];

    // Generate unique stream name for this worker
    testStreamName = getUniqueStreamName(testInfo, 'edit-test');
    await safeDeleteStream(apiServices, testStreamName);

    // Create a test stream with routing rules first
    await apiServices.streams.forkStream('logs', testStreamName, {
      field: 'service.name',
      eq: `test-service-w${testInfo.workerIndex}`,
    });
    createdStreams.push(testStreamName);

    await pageObjects.streams.gotoPartitioningTab('logs');
  });

  test.afterEach(async ({ apiServices }) => {
    await cleanupTestStreams(apiServices, createdStreams);
  });

  test('should edit an existing routing rule', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickEditRoutingRule(testStreamName);

    // Update condition
    await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
    await pageObjects.streams.updateRoutingRule();

    // Verify success
    const routingRule = page.getByTestId(`routingRule-${testStreamName}`);
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText(
      'updated-service'
    );
  });

  test('should cancel editing routing rule', async ({ page, pageObjects }, testInfo) => {
    await pageObjects.streams.clickEditRoutingRule(testStreamName);

    // Update and cancel changes
    await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
    await pageObjects.streams.cancelRoutingRule();

    // Verify success - original value should still be there
    const routingRule = page.getByTestId(`routingRule-${testStreamName}`);
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText(
      `test-service-w${testInfo.workerIndex}`
    );
  });

  test('should switch between editing different rules', async ({ apiServices, pageObjects }, testInfo) => {
    // Create another test rule
    const secondStreamSuffix = `edit-test-2-w${testInfo.workerIndex}`;
    const secondStreamName = `logs.${secondStreamSuffix}`;

    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName(secondStreamSuffix);
    await pageObjects.streams.fillConditionEditor({
      field: 'log.level',
      value: 'info',
      operator: 'equals',
    });
    await pageObjects.streams.saveRoutingRule();
    createdStreams.push(secondStreamName);

    // Edit first rule
    await pageObjects.streams.clickEditRoutingRule(testStreamName);

    // Switch to edit second rule without saving
    await pageObjects.streams.clickEditRoutingRule(secondStreamName);

    // Should now be editing the second rule
    expect(await pageObjects.streams.conditionEditorValueComboBox.getSelectedValue()).toBe('info');
  });

  test('should remove routing rule with confirmation', async ({ pageObjects }) => {
    await pageObjects.streams.clickEditRoutingRule(testStreamName);

    await pageObjects.streams.removeRoutingRule();

    // Confirm deletion in modal
    await pageObjects.streams.confirmStreamDeleteInModal(testStreamName);

    await pageObjects.streams.expectRoutingRuleHidden(testStreamName);
    await pageObjects.toasts.waitFor();

    // Stream is deleted, remove from cleanup list
    createdStreams = createdStreams.filter(s => s !== testStreamName);
  });

  test('should cancel rule removal', async ({ pageObjects }) => {
    await pageObjects.streams.clickEditRoutingRule(testStreamName);
    await pageObjects.streams.removeRoutingRule();

    // Cancel deletion
    await pageObjects.streams.cancelDeleteInModal();

    // Verify rule still exists
    await pageObjects.streams.expectRoutingRuleVisible(testStreamName);
  });
});
