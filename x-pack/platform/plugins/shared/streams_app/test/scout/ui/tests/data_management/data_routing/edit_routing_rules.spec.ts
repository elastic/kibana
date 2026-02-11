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

// Note: Routing rule condition updates and status changes API correctness is covered by
// API tests in x-pack/platform/plugins/shared/streams/test/scout/api/tests/routing_fork_stream.spec.ts
// These UI tests focus on the user experience: cancel flows, confirmation modals, and switching between rules
test.describe(
  'Stream data routing - editing routing rules',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs', 'logs.edit-test', {
        field: 'service.name',
        eq: 'test-service',
      });

      await pageObjects.streams.gotoPartitioningTab('logs');
    });

    test.afterAll(async ({ apiServices }) => {
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
    });

    test('should edit an existing routing rule', async ({ page, pageObjects }) => {
      const rountingRuleName = 'logs.edit-test';
      await pageObjects.streams.clickEditRoutingRule(rountingRuleName);

      // Update condition
      await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
      await pageObjects.streams.updateRoutingRule();

      // Verify success
      const routingRule = page.getByTestId('routingRule-logs.edit-test');
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

    test('should cancel editing routing rule', async ({ page, pageObjects }) => {
      const rountingRuleName = 'logs.edit-test';
      await pageObjects.streams.clickEditRoutingRule(rountingRuleName);

      // Update and cancel changes
      await pageObjects.streams.fillConditionEditor({ value: 'updated-service' });
      await pageObjects.streams.cancelRoutingRule();

      // Verify success
      const routingRule = page.getByTestId('routingRule-logs.edit-test');
      await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
        'service.name'
      );
      await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
        'equals'
      );
      await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText(
        'test-service'
      );
    });

    test('should switch between editing different rules', async ({ pageObjects }) => {
      // Create another test rule
      await pageObjects.streams.clickCreateRoutingRule();
      await pageObjects.streams.fillRoutingRuleName('edit-test-2');
      await pageObjects.streams.fillConditionEditor({
        field: 'log.level',
        value: 'info',
        operator: 'equals',
      });
      await pageObjects.streams.saveRoutingRule();

      // Edit first rule
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      // Switch to edit second rule without saving
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test-2');

      // Should now be editing the second rule
      expect(await pageObjects.streams.conditionEditorValueComboBox.getSelectedValue()).toBe(
        'info'
      );
    });

    test('should remove routing rule with confirmation', async ({ pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');

      await pageObjects.streams.removeRoutingRule();

      // Confirm deletion in modal
      await pageObjects.streams.confirmStreamDeleteInModal('logs.edit-test');

      await pageObjects.streams.expectRoutingRuleHidden('logs.edit-test');
      await pageObjects.toasts.waitFor();
    });

    test('should cancel rule removal', async ({ pageObjects }) => {
      await pageObjects.streams.clickEditRoutingRule('logs.edit-test');
      await pageObjects.streams.removeRoutingRule();

      // Cancel deletion
      await pageObjects.streams.cancelDeleteInModal();

      // Verify rule still exists
      await pageObjects.streams.expectRoutingRuleVisible('logs.edit-test');
    });
  }
);
