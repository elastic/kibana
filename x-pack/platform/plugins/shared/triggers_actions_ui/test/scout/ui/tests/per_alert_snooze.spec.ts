/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Scout UI tests for the per-alert snooze feature.
 *
 * These tests cover the snooze / unsnooze row-action flow exposed on the
 * rule-details alerts tab (the new EuiDataGrid-based alerts table that renders
 * when the rule type has alert-as-data mappings).
 *
 * Data setup strategy: alert documents are indexed directly via `esClient`
 * (same technique used in rule_details_alerts_tab.spec.ts) to avoid waiting
 * for a live rule execution cycle.
 */

// Unique suffix prevents collisions between concurrent test runs.
const TEST_RUN_ID = Date.now();
const RULE_NAME = `Scout Per-Alert Snooze ${TEST_RUN_ID}`;
const ALERTS_INDEX = '.internal.alerts-stack.alerts-default-000001';
const ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-*';
const INDEX_THRESHOLD_RULE_TYPE_ID = '.index-threshold';
const ALERT_INSTANCE_ID_VALUE = `snooze-test-instance-${TEST_RUN_ID}`;
const ALERT_UUID = `per-alert-snooze-${TEST_RUN_ID}`;

// How long to wait for async operations (API call + React re-render + query invalidation).
const ASYNC_TIMEOUT = 10_000;

test.describe('Per-alert snooze (rule details alerts tab)', { tag: tags.stateful.classic }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices, esClient }) => {
    // Ensure the alerts backing index and alias exist (ILM may not have rolled
    // it yet on a freshly started test server).
    await esClient.indices.create({ index: ALERTS_INDEX }, { ignore: [400] });
    await esClient.indices.putAlias({
      index: ALERTS_INDEX,
      name: '.alerts-stack.alerts-default',
    });

    // Create a disabled index-threshold rule. The rule never executes so the
    // snooze API is exercised purely through the UI action.
    const ruleResponse = await apiServices.alerting.rules.create({
      name: RULE_NAME,
      ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
      consumer: 'alerts',
      enabled: false,
      schedule: { interval: '1m' },
      actions: [],
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: '@timestamp',
      },
    });
    ruleId = ruleResponse.data.id;

    // Seed a single active alert document so the new AlertsTable renders on
    // the rule-details page (it requires at least one document to show the grid).
    const now = new Date().toISOString();
    await esClient.index({
      index: ALERTS_INDEX,
      id: ALERT_UUID,
      refresh: 'wait_for',
      document: {
        '@timestamp': now,
        'kibana.alert.uuid': ALERT_UUID,
        'kibana.alert.start': now,
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.rule.name': RULE_NAME,
        'kibana.alert.rule.uuid': ruleId,
        'kibana.alert.rule.rule_type_id': INDEX_THRESHOLD_RULE_TYPE_ID,
        'kibana.alert.rule.category': 'index threshold',
        'kibana.alert.rule.consumer': 'alerts',
        'kibana.alert.instance.id': ALERT_INSTANCE_ID_VALUE,
        'kibana.alert.time_range': { gte: now },
        'kibana.space_ids': ['default'],
        'event.kind': 'signal',
        'event.action': 'open',
      },
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    if (!ruleId) return;

    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX_PATTERN,
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      });
    } catch {
      // Continue cleanup even if alert deletion fails
    }

    try {
      await apiServices.alerting.rules.delete(ruleId);
    } catch {
      // Continue cleanup even if rule deletion fails
    }
  });

  test('snoozes an active alert for 1 hour via the row action menu and the snooze badge appears', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    // Open the "More actions" kebab menu for the first alert row.
    await page.testSubj.locator('alertsTableRowActionMore').click();
    const actionsMenu = page.testSubj.locator('alertsTableActionsMenu');
    await expect(actionsMenu).toBeVisible();

    // Click the Snooze item — this swaps the menu for the inline snooze panel.
    await page.testSubj.click('snooze-alert-action-snooze');
    const snoozePanel = page.testSubj.locator('alertSnoozePanel');
    await expect(snoozePanel).toBeVisible();

    // Select the "1h" preset from the Quick snooze duration button group.
    const durationOptions = page.testSubj.locator('quickSnoozeDurationOptions');
    await durationOptions.getByText('1h').click();

    // Apply the snooze — triggers an API call followed by a table refresh.
    await page.testSubj.click('alertSnoozeApplyButton');

    // After the API call resolves and the table re-fetches snooze state, the
    // bell badge should be visible in the status cell of the row.
    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });
  });

  test('snoozes an active alert with a condition-based snooze (any operator)', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    // Ensure the alert is not snoozed before entering this test.
    await kbnClient.request({
      method: 'POST',
      path: `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
        ALERT_INSTANCE_ID_VALUE
      )}/_unsnooze`,
    });

    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await page.testSubj.locator('alertsTableRowActionMore').click();
    await expect(page.testSubj.locator('alertsTableActionsMenu')).toBeVisible();

    await page.testSubj.click('snooze-alert-action-snooze');
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    // Switch to the "Condition based" tab.
    await page.testSubj.locator('alertSnoozeTabs').getByText('Condition based').click();

    // Add a severity_equals condition (no snapshot fetch required, just existence check).
    await page.testSubj.click('addDataCondition');
    await page.testSubj.locator('dataConditionType-dc-1').selectOption('severity_equals');
    // Value defaults to "critical" — confirm immediately.
    await page.testSubj.click('confirmDataCondition-dc-1');

    // Apply — conditionOperator defaults to 'any' with a single condition.
    await page.testSubj.click('alertSnoozeApplyButton');

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });
  });

  test('snoozes an active alert with two conditions using the all operator', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    await kbnClient.request({
      method: 'POST',
      path: `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
        ALERT_INSTANCE_ID_VALUE
      )}/_unsnooze`,
    });

    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await page.testSubj.locator('alertsTableRowActionMore').click();
    await expect(page.testSubj.locator('alertsTableActionsMenu')).toBeVisible();

    await page.testSubj.click('snooze-alert-action-snooze');
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    await page.testSubj.locator('alertSnoozeTabs').getByText('Condition based').click();

    // First condition: severity_equals critical (default value).
    await page.testSubj.click('addDataCondition');
    await page.testSubj.locator('dataConditionType-dc-1').selectOption('severity_equals');
    await page.testSubj.click('confirmDataCondition-dc-1');

    // Second condition: severity_equals high.
    await page.testSubj.click('addDataCondition');
    await page.testSubj.locator('dataConditionType-dc-2').selectOption('severity_equals');
    await page.testSubj.locator('dataConditionValue-dc-2').selectOption('high');
    await page.testSubj.click('confirmDataCondition-dc-2');

    // Toggle the logical operator from 'any' to 'all'.
    await page.testSubj.click('logicalOperator');

    await page.testSubj.click('alertSnoozeApplyButton');

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });
  });

  test('snoozes an active alert with a combined time and condition-based snooze', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    await kbnClient.request({
      method: 'POST',
      path: `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
        ALERT_INSTANCE_ID_VALUE
      )}/_unsnooze`,
    });

    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await page.testSubj.locator('alertsTableRowActionMore').click();
    await expect(page.testSubj.locator('alertsTableActionsMenu')).toBeVisible();

    await page.testSubj.click('snooze-alert-action-snooze');
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    await page.testSubj.locator('alertSnoozeTabs').getByText('Condition based').click();

    // Add a time condition and confirm with the default 1 h duration.
    await page.testSubj.click('addTimeCondition');
    await page.testSubj.click('confirmTimeCondition');

    // Add a data condition: severity_equals critical.
    await page.testSubj.click('addDataCondition');
    await page.testSubj.locator('dataConditionType-dc-1').selectOption('severity_equals');
    await page.testSubj.click('confirmDataCondition-dc-1');

    await page.testSubj.click('alertSnoozeApplyButton');

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });
  });

  test('unsnoozes an alert via the row action menu and the snooze badge disappears', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    // Pre-condition: snooze the alert instance via the API so the UI shows the
    // "Unsnooze" action without having to re-exercise the snooze flow.
    await kbnClient.request({
      method: 'POST',
      path: `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
        ALERT_INSTANCE_ID_VALUE
      )}/_snooze`,
      body: { expires_at: '2099-12-31T23:59:59.000Z' },
    });

    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    // The badge should already be visible because the rule SO has a snoozed instance.
    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });

    // Open the actions menu — the Unsnooze item appears for a snoozed alert.
    await page.testSubj.locator('alertsTableRowActionMore').click();
    const actionsMenu = page.testSubj.locator('alertsTableActionsMenu');
    await expect(actionsMenu).toBeVisible();

    await page.testSubj.click('snooze-alert-action-unsnooze');

    // After the unsnooze API call resolves and the table re-fetches snooze state,
    // the badge should no longer be visible.
    await expect(page.testSubj.locator('alertSnoozedBadge')).not.toBeVisible({
      timeout: ASYNC_TIMEOUT,
    });
  });
});
