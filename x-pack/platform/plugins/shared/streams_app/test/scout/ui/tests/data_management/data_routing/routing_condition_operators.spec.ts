/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data routing - condition operators', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.enable();
    // Generate logs data for testing
    await logsSynthtraceEsClient.clean();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);
  });

  test.afterEach(async ({ apiServices }) => {
    // Clean up routing rules created during the test
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await logsSynthtraceEsClient.clean();
    await apiServices.streams.clearStreamChildren('logs');
    await apiServices.streams.disable();
  });

  test('should create routing rule with "not equals" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('neq-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_text',
      operator: 'not equals',
      value: 'info',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.neq-test');
    const routingRule = page.getByTestId('routingRule-logs.neq-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_text'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'not equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('info');
  });

  test('should create routing rule with "contains" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('contains-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'body.text',
      operator: 'contains',
      value: 'log',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.contains-test');
    const routingRule = page.getByTestId('routingRule-logs.contains-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'body.text'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'contains'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('log');
  });

  test('should create routing rule with "starts with" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('startswith-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'starts with',
      value: 'web',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.startswith-test');
    const routingRule = page.getByTestId('routingRule-logs.startswith-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'starts with'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('web');
  });

  test('should create routing rule with "ends with" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('endswith-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'service.name',
      operator: 'ends with',
      value: 'service',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.endswith-test');
    const routingRule = page.getByTestId('routingRule-logs.endswith-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'service.name'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'ends with'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText(
      'service'
    );
  });

  test('should create routing rule with "greater than" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('gt-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_number',
      operator: 'greater than',
      value: '10',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.gt-test');
    const routingRule = page.getByTestId('routingRule-logs.gt-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_number'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'greater than'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('10');
  });

  test('should create routing rule with "greater than or equals" operator', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('gte-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_number',
      operator: 'greater than or equals',
      value: '5',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.gte-test');
    const routingRule = page.getByTestId('routingRule-logs.gte-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_number'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'greater than or equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('5');
  });

  test('should create routing rule with "less than" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('lt-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_number',
      operator: 'less than',
      value: '15',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.lt-test');
    const routingRule = page.getByTestId('routingRule-logs.lt-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_number'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'less than'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('15');
  });

  test('should create routing rule with "less than or equals" operator', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('lte-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'severity_number',
      operator: 'less than or equals',
      value: '20',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.lte-test');
    const routingRule = page.getByTestId('routingRule-logs.lte-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'severity_number'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'less than or equals'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayValue')).toContainText('20');
  });

  test('should create routing rule with "exists" operator', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('exists-test');

    await pageObjects.streams.fillConditionEditor({
      field: 'trace.id',
      operator: 'exists',
    });

    await pageObjects.streams.saveRoutingRule();

    await pageObjects.streams.expectRoutingRuleVisible('logs.exists-test');
    const routingRule = page.getByTestId('routingRule-logs.exists-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayField')).toContainText(
      'trace.id'
    );
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'exists'
    );
  });

  test('should switch operator from equals to contains and update condition', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();
    await pageObjects.streams.fillRoutingRuleName('operator-switch-test');

    // Start with equals
    await pageObjects.streams.fillConditionEditor({
      field: 'body.text',
      operator: 'equals',
      value: 'test',
    });

    // Verify preview shows data
    await pageObjects.streams.expectPreviewPanelVisible();

    // Switch to contains
    await pageObjects.streams.fillConditionEditor({
      operator: 'contains',
    });

    // Verify preview updates (should show different results)
    await pageObjects.streams.expectPreviewPanelVisible();

    await pageObjects.streams.saveRoutingRule();

    // Verify final condition uses contains
    await pageObjects.streams.expectRoutingRuleVisible('logs.operator-switch-test');
    const routingRule = page.getByTestId('routingRule-logs.operator-switch-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'contains'
    );
  });

  test('should handle operator change when editing existing rule', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    // Create a rule via API with equals operator
    await apiServices.streams.forkStream('logs', 'logs.edit-operator-test', {
      field: 'severity_text',
      eq: 'info',
    });

    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.streams.clickEditRoutingRule('logs.edit-operator-test');

    // Change operator to contains
    await pageObjects.streams.fillConditionEditor({
      operator: 'contains',
      value: 'inf',
    });

    await pageObjects.streams.updateRoutingRule();
    await pageObjects.toasts.waitFor();
    await pageObjects.toasts.closeAll();

    // Verify the condition was updated - check the saved rule displays the operator
    await pageObjects.streams.expectRoutingRuleVisible('logs.edit-operator-test');
    const routingRule = page.getByTestId('routingRule-logs.edit-operator-test');
    await expect(routingRule.getByTestId('streamsAppConditionDisplayOperator')).toContainText(
      'contains'
    );
  });
});
