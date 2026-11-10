/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Least-privilege role for the snooze flow: alerting `all` on stack rule types
 * (snooze/unsnooze is a write on the rule instance) plus read on the alerts
 * index so the rule-details alerts table renders. Deliberately avoids admin so
 * the suite catches permission regressions for non-admin editors/operators.
 * Mirrors `alerts_and_actions_role` from the FTR config, minus `actions` (this
 * rule has no connectors).
 */
const SNOOZE_ALERT_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

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

  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    // Reset snooze state before every test so the suite is order-independent and
    // no test silently relies on the state left by a previous one. Unsnooze is
    // idempotent server-side (a no-op when the instance isn't snoozed), so this
    // is safe even on the first run.
    await kbnClient.request({
      method: 'POST',
      path: `/api/alerting/rule/${encodeURIComponent(ruleId)}/alert/${encodeURIComponent(
        ALERT_INSTANCE_ID_VALUE
      )}/_unsnooze`,
    });

    await browserAuth.loginWithCustomRole(SNOOZE_ALERT_ROLE);
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    if (!ruleId) return;

    await esClient.deleteByQuery({
      index: ALERTS_INDEX_PATTERN,
      refresh: true,
      conflicts: 'proceed',
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
    });

    await apiServices.alerting.rules.delete(ruleId);
  });

  test('snoozes an active alert for 1 hour via the row action menu and the snooze badge appears', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    // Open the row action menu and swap it for the inline snooze panel.
    await pageObjects.ruleDetailsPage.openAlertSnoozePanel();
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    // Select the "1h" preset from the Quick snooze duration button group.
    await page.testSubj.locator('quickSnoozeDurationOptions').getByText('1h').click();

    // Apply the snooze — triggers an API call followed by a table refresh.
    await pageObjects.ruleDetailsPage.applySnooze();

    // After the API call resolves and the table re-fetches snooze state, the
    // bell badge should be visible in the status cell of the row.
    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible();
  });

  test('snoozes an active alert with a condition-based snooze (any operator)', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await pageObjects.ruleDetailsPage.openAlertSnoozePanel();
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    await pageObjects.ruleDetailsPage.openConditionBasedSnoozeTab();

    // Add a severity_equals condition (value defaults to "critical").
    await pageObjects.ruleDetailsPage.addSeverityDataCondition(1);

    // Apply — conditionOperator defaults to 'any' with a single condition.
    await pageObjects.ruleDetailsPage.applySnooze();

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible();
  });

  test('snoozes an active alert with two conditions using the all operator', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await pageObjects.ruleDetailsPage.openAlertSnoozePanel();
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    await pageObjects.ruleDetailsPage.openConditionBasedSnoozeTab();

    // First condition: severity_equals critical (default value).
    await pageObjects.ruleDetailsPage.addSeverityDataCondition(1);
    // Second condition: severity_equals high.
    await pageObjects.ruleDetailsPage.addSeverityDataCondition(2, 'high');

    // Toggle the logical operator from 'any' to 'all'.
    await page.testSubj.click('logicalOperator');

    await pageObjects.ruleDetailsPage.applySnooze();

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible();
  });

  test('snoozes an active alert with a combined time and condition-based snooze', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();
    await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();

    await pageObjects.ruleDetailsPage.openAlertSnoozePanel();
    await expect(page.testSubj.locator('alertSnoozePanel')).toBeVisible();

    await pageObjects.ruleDetailsPage.openConditionBasedSnoozeTab();

    // Add a time condition and confirm with the default 1 h duration.
    await page.testSubj.click('addTimeCondition');
    await page.testSubj.click('confirmTimeCondition');

    // Add a data condition: severity_equals critical.
    await pageObjects.ruleDetailsPage.addSeverityDataCondition(1);

    await pageObjects.ruleDetailsPage.applySnooze();

    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible();
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
    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeVisible();

    // Open the actions menu — the Unsnooze item appears for a snoozed alert.
    await pageObjects.ruleDetailsPage.unsnoozeAlert();

    // After the unsnooze API call resolves and the table re-fetches snooze state,
    // the badge should no longer be visible.
    await expect(page.testSubj.locator('alertSnoozedBadge')).toBeHidden();
  });
});
