/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/embeddable_alerts_table/embeddable_alerts_table.ts
//
// Source: 8 tests total, 2 already describe.skip in FTR for flakiness (#258426).
// Migrated: 5 of the 6 non-skipped FTR tests (kept as test.skip: 3 that need
//   cross-test panel state from a shared dashboard session).
// Config editor tests kept as test.skip (flaky upstream, #258426).
//
// EuiSuperSelect fix applied to the two solution-filter tests:
//   The flyout's useEffectOnce auto-opens the solution-selector popover on
//   mount. Clicking the trigger would close it, so we click the option button
//   directly instead.

import type { KibanaRole, KbnClient } from '@kbn/scout';
import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// ─── test-subject constants (inlined to avoid cross-package imports) ─────────
const FILTERS_FORM_SUBJ = 'alertsFiltersForm';
const FILTERS_FORM_ITEM_SUBJ = 'alertsFiltersFormItem';
const SOLUTION_SELECTOR_SUBJ = 'solutionSelector';
const RULE_TAGS_FILTER_SUBJ = 'ruleTagsFilter';
const SAVE_CONFIG_BUTTON_SUBJ = 'saveConfigButton';
const DASHBOARD_PANEL_TEST_SUBJ = 'dashboardPanel';

// ─── KibanaRole definitions ───────────────────────────────────────────────────
const dashboardsPermission = { dashboard_v2: ['all'] } as const;

const STACK_ALERTING_ROLE: KibanaRole = {
  kibana: [
    {
      base: [],
      feature: { stackAlerts: ['all'], ...dashboardsPermission },
      spaces: ['*'],
    },
  ],
};

const OBSERVABILITY_ALERTING_ROLE: KibanaRole = {
  kibana: [
    {
      base: [],
      feature: { logs: ['all'], ...dashboardsPermission },
      spaces: ['*'],
    },
  ],
};

const SECURITY_ALERTING_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
        field_security: { grant: ['*'], except: [] },
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: { siemV2: ['all'], ...dashboardsPermission },
      spaces: ['*'],
    },
  ],
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const installSampleData = (kbnClient: KbnClient) =>
  kbnClient.request({ method: 'POST', path: '/api/sample_data/logs', headers: {} });

const removeSampleData = (kbnClient: KbnClient) =>
  kbnClient.request({ method: 'DELETE', path: '/api/sample_data/logs', headers: {} });

const createStackRule = async (kbnClient: KbnClient) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/alerting/rule',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name: 'stack-rule',
      rule_type_id: '.es-query',
      consumer: 'stackAlerts',
      schedule: { interval: '5s' },
      actions: [],
      tags: ['stack-rule'],
      params: {
        searchType: 'esQuery',
        timeWindowSize: 5,
        timeWindowUnit: 'd',
        threshold: [0],
        thresholdComparator: '>',
        size: 100,
        esQuery: '{"query":{"match_all":{}}}',
        aggType: 'count',
        groupBy: 'all',
        termSize: 5,
        excludeHitsFromPreviousRun: false,
        sourceFields: [],
        index: ['kibana_sample_data_logs'],
        timeField: '@timestamp',
      },
    },
  });
  return resp.data;
};

const createObservabilityRule = async (kbnClient: KbnClient, dataViewId: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/alerting/rule',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name: 'observability-rule',
      rule_type_id: 'observability.rules.custom_threshold',
      consumer: 'logs',
      schedule: { interval: '5s' },
      actions: [],
      tags: ['observability-rule'],
      params: {
        criteria: [
          {
            comparator: '>',
            metrics: [{ name: 'A', aggType: 'count' }],
            threshold: [0],
            timeSize: 1,
            timeUnit: 'd',
          },
        ],
        alertOnNoData: false,
        alertOnGroupDisappear: false,
        searchConfiguration: {
          query: { query: '', language: 'kuery' },
          index: dataViewId,
        },
      },
    },
  });
  return resp.data;
};

const createSecurityRule = async (kbnClient: KbnClient) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/detection_engine/rules',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name: 'security-rule',
      description: 'Scout embeddable alerts table test rule',
      enabled: true,
      risk_score: 1,
      rule_id: `scout-embeddable-alerts-${Date.now()}`,
      severity: 'low',
      type: 'query',
      query: '_id: *',
      index: ['kibana_sample_data_logs'],
      from: 'now-1y',
      interval: '1m',
      tags: ['security-rule'],
    },
  });
  return resp.data;
};

const deleteAlertingRule = (kbnClient: KbnClient, id: string) =>
  kbnClient.request({
    method: 'DELETE',
    path: `/api/alerting/rule/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
  });

const deleteSecurityRule = (kbnClient: KbnClient, id: string) =>
  kbnClient.request({
    method: 'DELETE',
    path: `/api/detection_engine/rules?id=${id}`,
    headers: { 'kbn-xsrf': 'scout' },
  });

const runRuleSoon = (kbnClient: KbnClient, id: string) =>
  kbnClient.request({
    method: 'POST',
    path: `/internal/alerting/rule/${id}/_run_soon`,
    headers: { 'kbn-xsrf': 'scout' },
  });

// ─── spec ─────────────────────────────────────────────────────────────────────

test.describe('Embeddable alerts panel', { tag: tags.stateful.classic }, () => {
  const alertingRuleIds: string[] = [];
  let securityRuleId: string | undefined;

  test.beforeAll(async ({ kbnClient }) => {
    await installSampleData(kbnClient);

    const dvResp = await kbnClient.request<{
      data_view: Array<{ id: string; title: string }>;
    }>({ method: 'GET', path: '/api/data_views', headers: {} });
    const logsDataView = dvResp.data.data_view.find((dv) => dv.title === 'kibana_sample_data_logs');

    const securityRule = await createSecurityRule(kbnClient);
    securityRuleId = securityRule.id;

    const [stackRule, observabilityRule] = await Promise.all([
      createStackRule(kbnClient),
      logsDataView ? createObservabilityRule(kbnClient, logsDataView.id) : Promise.resolve(null),
    ]);
    if (stackRule) alertingRuleIds.push(stackRule.id);
    if (observabilityRule) alertingRuleIds.push(observabilityRule.id);

    await Promise.allSettled(
      [...alertingRuleIds, ...(securityRuleId ? [securityRuleId] : [])].map((id) =>
        runRuleSoon(kbnClient, id)
      )
    );
  });

  test.afterAll(async ({ kbnClient }) => {
    await Promise.allSettled([
      ...alertingRuleIds.map((id) => deleteAlertingRule(kbnClient, id)),
      ...(securityRuleId ? [deleteSecurityRule(kbnClient, securityRuleId)] : []),
    ]);
    alertingRuleIds.length = 0;
    securityRuleId = undefined;
    await removeSampleData(kbnClient).catch(() => {});
  });

  // ── Config editor tests (skipped: flaky upstream #258426) ─────────────────
  test.skip('Config editor: should show the solution picker when multiple solutions are available', () => {});

  test.skip('Config editor: should ask for confirmation before resetting filters when switching solution', () => {});

  // ── Per-solution tests ────────────────────────────────────────────────────

  test('should only be able to create panels with stack rule types', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(STACK_ALERTING_ROLE);
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.toasts.closeAll();
    await pageObjects.dashboard.openAddPanelFlyout();
    await page.testSubj.click('create-action-Alerts');

    await expect(page.testSubj.locator(FILTERS_FORM_SUBJ)).toBeVisible({ timeout: 10_000 });
    await expect(page.testSubj.locator(SOLUTION_SELECTOR_SUBJ)).toBeHidden();

    await page
      .locator(`[data-test-subj="${FILTERS_FORM_ITEM_SUBJ}"] button`)
      .click({ force: true }); // force: inside focus-trapped flyout
    await page.locator('button#ruleTags').click({ force: true });
    await page.testSubj.click('comboBoxToggleListButton');

    const options = page.testSubj.locator(RULE_TAGS_FILTER_SUBJ).locator('option');
    await expect(options).toHaveCount(1);
    await expect(options[0]).toHaveText('stack-rule');
    await options[0].click();

    await pageObjects.toasts.closeAll();
    await page.testSubj.click(SAVE_CONFIG_BUTTON_SUBJ);
    await expect(page.testSubj.locator(DASHBOARD_PANEL_TEST_SUBJ)).toBeVisible({ timeout: 15_000 });

    const tagCells = page.locator(
      '[data-gridcell-column-id="kibana.alert.rule.tags"] [data-test-subj="dataGridRowCell"]'
    );
    await expect
      .poll(async () => tagCells.count(), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0);
    const tagTexts = await tagCells.allInnerTexts();
    expect(tagTexts.every((t) => t.includes('stack-rule'))).toBe(true);
  });

  test('should only be able to create panels with observability rule types', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(OBSERVABILITY_ALERTING_ROLE);
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.toasts.closeAll();
    await pageObjects.dashboard.openAddPanelFlyout();
    await page.testSubj.click('create-action-Alerts');

    await expect(page.testSubj.locator(FILTERS_FORM_SUBJ)).toBeVisible({ timeout: 10_000 });
    await expect(page.testSubj.locator(SOLUTION_SELECTOR_SUBJ)).toBeHidden();

    await page
      .locator(`[data-test-subj="${FILTERS_FORM_ITEM_SUBJ}"] button`)
      .click({ force: true }); // force: inside focus-trapped flyout
    await page.locator('button#ruleTags').click({ force: true });
    await page.testSubj.click('comboBoxToggleListButton');

    const options = page.testSubj.locator(RULE_TAGS_FILTER_SUBJ).locator('option');
    await expect(options).toHaveCount(1);
    await expect(options[0]).toHaveText('observability-rule');
    await options[0].click();

    await pageObjects.toasts.closeAll();
    await page.testSubj.click(SAVE_CONFIG_BUTTON_SUBJ);
    await expect(page.testSubj.locator(DASHBOARD_PANEL_TEST_SUBJ)).toBeVisible({ timeout: 15_000 });

    const tagCells = page.locator(
      '[data-gridcell-column-id="kibana.alert.rule.tags"] [data-test-subj="dataGridRowCell"]'
    );
    await expect
      .poll(async () => tagCells.count(), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0);
    const tagTexts = await tagCells.allInnerTexts();
    expect(tagTexts.every((t) => t.includes('observability-rule'))).toBe(true);
  });

  test('should only be able to create panels with security rule types', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(SECURITY_ALERTING_ROLE);
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.toasts.closeAll();
    await pageObjects.dashboard.openAddPanelFlyout();
    await page.testSubj.click('create-action-Alerts');

    await expect(page.testSubj.locator(FILTERS_FORM_SUBJ)).toBeVisible({ timeout: 10_000 });
    await expect(page.testSubj.locator(SOLUTION_SELECTOR_SUBJ)).toBeHidden();

    await page
      .locator(`[data-test-subj="${FILTERS_FORM_ITEM_SUBJ}"] button`)
      .click({ force: true }); // force: inside focus-trapped flyout
    await page.locator('button#ruleTags').click({ force: true });
    await page.testSubj.click('comboBoxToggleListButton');

    const options = page.testSubj.locator(RULE_TAGS_FILTER_SUBJ).locator('option');
    await expect(options).toHaveCount(1);
    await expect(options[0]).toHaveText('security-rule');
    await options[0].click();

    await pageObjects.toasts.closeAll();
    await page.testSubj.click(SAVE_CONFIG_BUTTON_SUBJ);
    await expect(page.testSubj.locator(DASHBOARD_PANEL_TEST_SUBJ)).toBeVisible({ timeout: 15_000 });

    const tagCells = page.locator(
      '[data-gridcell-column-id="kibana.alert.rule.tags"] [data-test-subj="dataGridRowCell"]'
    );
    await expect
      .poll(async () => tagCells.count(), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0);
    const tagTexts = await tagCells.allInnerTexts();
    expect(tagTexts.every((t) => t.includes('security-rule'))).toBe(true);
  });

  // ── Solution-filter tests ─────────────────────────────────────────────────
  // EuiSuperSelect fix: the flyout's useEffectOnce auto-opens the solution
  // selector popover; we click the option button directly instead of toggling
  // the trigger first.

  test('should only show alerts from the observability area (o11y+stack) when selecting it', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.toasts.closeAll();
    await pageObjects.dashboard.openAddPanelFlyout();
    await page.testSubj.click('create-action-Alerts');

    await expect(page.testSubj.locator(SOLUTION_SELECTOR_SUBJ)).toBeVisible({ timeout: 10_000 });
    await page.locator('button#observability').click({ force: true }); // force: portal in focus-trapped flyout

    await page.testSubj.click(SAVE_CONFIG_BUTTON_SUBJ);
    await expect(page.testSubj.locator(DASHBOARD_PANEL_TEST_SUBJ)).toBeVisible({ timeout: 15_000 });

    const featureCells = page.locator(
      '[data-gridcell-column-id="kibana.alert.rule.consumer"] [data-test-subj="dataGridRowCell"]'
    );
    await expect
      .poll(async () => featureCells.count(), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0);
    const features = await featureCells.allInnerTexts();
    const expectedFeatures = ['logs', 'stack'];
    expect(features.every((f) => expectedFeatures.some((ef) => f.toLowerCase().includes(ef)))).toBe(
      true
    );
  });

  test('should only show alerts from the security area when selecting it', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.openNewDashboard();
    await pageObjects.toasts.closeAll();
    await pageObjects.dashboard.openAddPanelFlyout();
    await page.testSubj.click('create-action-Alerts');

    await expect(page.testSubj.locator(SOLUTION_SELECTOR_SUBJ)).toBeVisible({ timeout: 10_000 });
    await page.locator('button#security').click({ force: true }); // force: portal in focus-trapped flyout

    await page.testSubj.click(SAVE_CONFIG_BUTTON_SUBJ);
    await expect(page.testSubj.locator(DASHBOARD_PANEL_TEST_SUBJ)).toBeVisible({ timeout: 15_000 });

    const featureCells = page.locator(
      '[data-gridcell-column-id="kibana.alert.rule.consumer"] [data-test-subj="dataGridRowCell"]'
    );
    await expect
      .poll(async () => featureCells.count(), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0);
    const features = await featureCells.allInnerTexts();
    expect(features.every((f) => f.toLowerCase().includes('siem'))).toBe(true);
  });

  // ── Tests skipped pending cross-test panel state / API-seeding approach ───
  // These verified authz prompts and time-range overrides on panels that the
  // FTR shared-session approach accumulated across the per-solution tests.
  // Block on establishing an API-seeding approach for embeddable panels.

  test.skip("should show a missing authz prompt when the user doesn't have access to a panel's rule types", () => {});

  test.skip('should apply the global time filter to alert panels by default', () => {});

  test.skip('should override the time range for specific panels', () => {});
});
