/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/rules/rules_list/rules_list.ts
//
// Rule type substitutions:
//   test.noop          → .es-query (built-in, always available in Scout stateful/classic)
//   test.failing       → .es-query with invalid query type (fails at ES execution time)
//   test.always-firing → .es-query with threshold >= 0 (always fires against .kibana)

import { randomUUID } from 'node:crypto';
import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, deleteRulesByPrefix } from '../fixtures';

// ── API helpers ──────────────────────────────────────────────────────────────

const disableRule = async (kbnClient: KbnClient, ruleId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/api/alerting/rule/${ruleId}/_disable`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

const snoozeRule = async (kbnClient: KbnClient, ruleId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/internal/alerting/rule/${ruleId}/_snooze`,
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      snooze_schedule: {
        duration: 100_000_000,
        rRule: { count: 1, dtstart: new Date().toISOString(), tzid: 'UTC' },
      },
    },
  });
};

const createSlackConnector = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      connector_type_id: '.slack',
      config: {},
      secrets: {
        webhookUrl: 'https://example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      },
    },
  });
  return resp.data;
};

const deleteConnector = async (kbnClient: KbnClient, connectorId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${connectorId}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

// Unknown query type — ES rejects it at search time, causing rule execution to fail
const FAILING_ES_QUERY = JSON.stringify({ query: { not_a_real_query_type: {} } });

const runRuleSoon = async (kbnClient: KbnClient, ruleId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/internal/alerting/rule/${ruleId}/_run_soon`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

const getAlertSummary = async (kbnClient: KbnClient, ruleId: string) => {
  const resp = await kbnClient.request<{ alerts: Record<string, { tracked: boolean }> }>({
    method: 'GET',
    path: `/internal/alerting/rule/${ruleId}/_alert_summary`,
    headers: {},
  });
  return resp.data;
};

const createFailingRule = async (kbnClient: KbnClient, name: string, ruleTags: string[]) => {
  const resp = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: '/api/alerting/rule',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      rule_type_id: '.es-query',
      consumer: 'alerts',
      enabled: true,
      schedule: { interval: '24h' },
      actions: [],
      tags: ruleTags,
      params: {
        searchType: 'esQuery',
        esQuery: FAILING_ES_QUERY,
        size: 100,
        thresholdComparator: '>',
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        index: ['.kibana'],
        timeField: 'updated_at',
        aggType: 'count',
        groupBy: 'all',
        termSize: 5,
      },
    },
  });
  return resp.data;
};

const createAlwaysFiringRule = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: '/api/alerting/rule',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      rule_type_id: '.es-query',
      consumer: 'alerts',
      enabled: true,
      schedule: { interval: '24h' },
      actions: [],
      tags: [],
      params: {
        searchType: 'esQuery',
        esQuery: JSON.stringify({ query: { match_all: {} } }),
        size: 100,
        thresholdComparator: '>=',
        threshold: [0],
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        index: ['.kibana'],
        timeField: 'updated_at',
        aggType: 'count',
        groupBy: 'all',
        termSize: 5,
      },
    },
  });
  return resp.data;
};

// ── UI helpers ────────────────────────────────────────────────────────────────

const searchRules = async (page: ScoutPage, query: string) => {
  const field = page.testSubj.locator('ruleSearchField');
  await field.fill(query);
  await field.press('Enter');
  await page
    .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
    .waitFor();
};

const refreshRulesList = async (page: ScoutPage) => {
  await page.testSubj.click('logsTab');
  await page.testSubj.click('rulesTab');
};

const getTableRows = (page: ScoutPage) =>
  page.testSubj.locator('rulesList').locator('[data-test-subj^="rule-row"]');

const ensureRuleStatus = async (
  page: ScoutPage,
  ruleName: string,
  status: 'enabled' | 'disabled'
) => {
  await expect(async () => {
    await searchRules(page, ruleName);
    // Scope statusDropdown to the specific rule's row so that other rules
    // matching the tokenized OR search don't cause a strict-mode violation.
    const ruleRow = page
      .locator('[data-test-subj^="rule-row"]')
      .filter({ has: page.testSubj.locator(`rulesListTableRowName-${ruleName}`) });
    await expect(ruleRow.locator('[data-test-subj="statusDropdown"]')).toHaveAttribute(
      'title',
      new RegExp(status, 'i'),
      { timeout: 5_000 }
    );
  }).toPass({ timeout: 30_000 });
};

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Rules list', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdConnectorIds: string[] = [];

  test.beforeAll(async ({ kbnClient }) => {
    // Remove stale rules left by failed previous runs to prevent cross-run interference.
    await Promise.all([
      deleteRulesByPrefix(kbnClient, 'delete-'),
      deleteRulesByPrefix(kbnClient, 'percentile-test-'),
      deleteRulesByPrefix(kbnClient, 'search-test-'),
      deleteRulesByPrefix(kbnClient, 'tags-test-'),
      deleteRulesByPrefix(kbnClient, 'reenable-single-'),
    ]);
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
    await page.testSubj.click('rulesTab');
  });

  test.afterEach(async ({ apiServices, kbnClient }) => {
    const ruleIds = [...createdRuleIds];
    createdRuleIds.length = 0;
    await Promise.allSettled(ruleIds.map((id) => apiServices.alerting.rules.delete(id)));

    const connectorIds = [...createdConnectorIds];
    createdConnectorIds.length = 0;
    await Promise.allSettled(connectorIds.map((id) => deleteConnector(kbnClient, id)));
  });

  test('should display alerts in alphabetical order', async ({ page, apiServices }) => {
    const uniqueTag = `alpha-order-${Date.now()}`;
    const [rb, rc, ra] = await Promise.all([
      apiServices.alerting.rules.create({ ...makeEsQueryRule('b'), tags: [uniqueTag] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule('c'), tags: [uniqueTag] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule('a'), tags: [uniqueTag] }),
    ]);
    createdRuleIds.push(rb.data.id, rc.data.id, ra.data.id);

    await refreshRulesList(page);
    await searchRules(page, uniqueTag);

    const nameLinks = page.testSubj
      .locator('rulesList')
      .locator('[data-test-subj^="rulesListTableRowName-"]');
    await expect(nameLinks).toHaveCount(3);
    const all = await nameLinks.all();
    await expect(all[0]).toHaveAttribute('data-test-subj', /^rulesListTableRowName-a-/);
    await expect(all[1]).toHaveAttribute('data-test-subj', /^rulesListTableRowName-b-/);
    await expect(all[2]).toHaveAttribute('data-test-subj', /^rulesListTableRowName-c-/);
  });

  test('should search for alert', async ({ page, apiServices }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('search-test'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    const rows = getTableRows(page);
    await expect(rows).toHaveCount(1);
    await expect(page.testSubj.locator(`rulesListTableRowName-${rule.data.name}`)).toBeVisible();
    await expect(page.testSubj.locator('rulesTableCell-interval')).toContainText('1 min');
    await expect(page.testSubj.locator('rulesTableCell-tagsPopover')).toContainText('1');
  });

  test('should update alert list on the search clear button click', async ({
    page,
    apiServices,
  }) => {
    // Use UUID-based names so the two rules share no search tokens, plus a shared
    // unique tag so we can scope assertions to exactly these two rules in a
    // cluster that may contain many others.
    const sharedTag = `clear-${randomUUID()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create({
        ...makeEsQueryRule('clearfind'),
        name: `clearfind-${randomUUID()}`,
        tags: [sharedTag],
      }),
      apiServices.alerting.rules.create({
        ...makeEsQueryRule('clearcheck'),
        name: `clearcheck-${randomUUID()}`,
        tags: [sharedTag],
      }),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await refreshRulesList(page);

    // Both rules match the shared tag.
    await searchRules(page, sharedTag);
    await expect(getTableRows(page)).toHaveCount(2);

    // Narrowing to r1's name filters down to a single rule.
    await searchRules(page, r1.data.name as string);
    await expect(getTableRows(page)).toHaveCount(1);
    await expect(page.testSubj.locator(`rulesListTableRowName-${r1.data.name}`)).toBeVisible();

    // The clear button resets the search field itself...
    await page.locator('.euiFormControlLayoutClearButton').click();
    await page
      .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
      .waitFor();
    await expect(page.testSubj.locator('ruleSearchField')).toHaveValue('');

    // ...and the previously-filtered-out rule is reachable again. Re-search by the
    // shared tag (rather than relying on the unfiltered list, where the two rules
    // may not share a page) to confirm both are restored.
    await searchRules(page, sharedTag);
    await expect(getTableRows(page)).toHaveCount(2);
    await expect(page.testSubj.locator(`rulesListTableRowName-${r2.data.name}`)).toBeVisible();
  });

  test('should search for tags', async ({ page, apiServices }) => {
    const rule = await apiServices.alerting.rules.create({
      ...makeEsQueryRule('tags-test'),
      tags: ['tag', 'tagtag', 'taggity tag'],
    });
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, `${rule.data.name} tag`);

    await expect(getTableRows(page)).toHaveCount(1);
    await expect(page.testSubj.locator(`rulesListTableRowName-${rule.data.name}`)).toBeVisible();
    await expect(page.testSubj.locator('rulesTableCell-tagsPopover')).toContainText('3');
  });

  test('should display an empty list when search did not return any alerts', async ({
    page,
    apiServices,
  }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('empty-search'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, "An Alert That For Sure Doesn't Exist!");

    await expect(page.testSubj.locator('rulesList')).toBeVisible();
    await expect(getTableRows(page)).toHaveCount(0);
  });

  test('should disable single alert', async ({ page, apiServices }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('disable-single'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('disableButton');
    await expect(page.testSubj.locator('confirmModalConfirmButton')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await ensureRuleStatus(page, rule.data.name as string, 'disabled');
  });

  test('should re-enable single alert', async ({ page, apiServices, kbnClient }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('reenable-single'));
    createdRuleIds.push(rule.data.id);

    // Disable via API so we can focus on testing the re-enable UI path without
    // the UntrackAlertsModal timing interfering.
    await disableRule(kbnClient, rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);
    await ensureRuleStatus(page, rule.data.name as string, 'disabled');

    // Re-enable via UI — no confirmation modal when enabling a disabled rule.
    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('disableButton');

    await ensureRuleStatus(page, rule.data.name as string, 'enabled');
    await expect(page.testSubj.locator(`rulesListTableRowName-${rule.data.name}`)).toBeVisible();
  });

  test('should delete single alert', async ({ page, apiServices }) => {
    const r1 = await apiServices.alerting.rules.create(makeEsQueryRule('delete-keep'));
    const r2 = await apiServices.alerting.rules.create(makeEsQueryRule('delete-target'));
    createdRuleIds.push(r1.data.id, r2.data.id);

    await refreshRulesList(page);
    await searchRules(page, r2.data.name as string);

    // Scope the action menu to r2's row so that other rules matching the
    // OR-tokenized search (e.g. r1) don't intercept the click.
    const r2Row = page
      .locator('[data-test-subj^="rule-row"]')
      .filter({ has: page.testSubj.locator(`rulesListTableRowName-${r2.data.name}`) });
    await r2Row.locator('[data-test-subj="collapsedItemActions"]').click();
    await page.testSubj.click('deleteRule');
    await expect(page.testSubj.locator('rulesDeleteConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText('Deleted 1 rule');

    // r2 is deleted via UI; afterEach will 404 on it but allSettled absorbs the error.
    await expect(page.testSubj.locator(`rulesListTableRowName-${r2.data.name}`)).toBeHidden();
  });

  test('should disable all selection', async ({ page, apiServices }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('bulk-disable'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await page.testSubj.click(`checkboxSelectRow-${rule.data.id}`);
    await page.testSubj.click('bulkAction');
    await page.testSubj.click('bulkDisable');
    await expect(page.testSubj.locator('confirmModalConfirmButton')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText('Disabled 1 rule');
    await ensureRuleStatus(page, rule.data.name as string, 'disabled');
  });

  test('should enable all selection', async ({ page, apiServices, kbnClient }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('bulk-enable'));
    createdRuleIds.push(rule.data.id);
    await disableRule(kbnClient, rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await page.testSubj.click(`checkboxSelectRow-${rule.data.id}`);
    await page.testSubj.click('bulkAction');
    await page.testSubj.click('bulkEnable');

    await ensureRuleStatus(page, rule.data.name as string, 'enabled');
    await expect(page.testSubj.locator(`rulesListTableRowName-${rule.data.name}`)).toBeVisible();
  });

  test('should render percentile column and cells correctly', async ({ page, apiServices }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('percentile-test'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await expect(page.testSubj.locator('rulesTable-P50ColumnName')).toBeVisible();
    await expect(page.testSubj.locator('P50Percentile')).toBeVisible();

    // Switch to P95
    await page.testSubj.click('percentileSelectablePopover-iconButton');
    await expect(page.testSubj.locator('percentileSelectablePopover-selectable')).toBeVisible();
    await page
      .locator('[data-test-subj="percentileSelectablePopover-selectable"] li:nth-child(2)')
      .click();
    await expect(page.testSubj.locator('percentileSelectablePopover-selectable')).toBeHidden();
    await expect(page.testSubj.locator('rulesTable-P95ColumnName')).toBeVisible();
    await expect(page.testSubj.locator('P95Percentile')).toBeVisible();
  });

  test('should render interval info icon when schedule interval is less than configured minimum', async ({
    page,
    apiServices,
  }) => {
    const uniqueTag = `interval-icon-${Date.now()}`;
    const [rShort, rNormal] = await Promise.all([
      apiServices.alerting.rules.create({
        ...makeEsQueryRule('a-short-interval'),
        tags: [uniqueTag],
        schedule: { interval: '1s' },
      }),
      apiServices.alerting.rules.create({
        ...makeEsQueryRule('b-normal-interval'),
        tags: [uniqueTag],
      }),
    ]);
    createdRuleIds.push(rShort.data.id, rNormal.data.id);

    await refreshRulesList(page);
    await searchRules(page, uniqueTag);

    // icon-0 → short-interval rule (appears first alphabetically as 'a-short-*')
    await expect(page.testSubj.locator('ruleInterval-config-icon-0')).toBeVisible();
    await expect(page.testSubj.locator('ruleInterval-config-icon-1')).toBeHidden();

    // clicking the icon opens edit flyout
    await page.testSubj.click('ruleInterval-config-icon-0');
    await expect(page.testSubj.locator('rulePageFooterCancelButton')).toBeVisible();
    await page.testSubj.click('rulePageFooterCancelButton');
  });

  test('should delete all selection', async ({ page, apiServices }) => {
    const namePrefix = `bulk-del-${Date.now()}`;
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule(namePrefix));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, namePrefix);

    await page.testSubj.click(`checkboxSelectRow-${rule.data.id}`);
    await page.testSubj.click('bulkAction');
    await page.testSubj.click('bulkDelete');
    await expect(page.testSubj.locator('rulesDeleteConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText('Deleted 1 rule');

    // Rule deleted via UI; afterEach will 404 on it but allSettled absorbs the error.
    await searchRules(page, namePrefix);
    await expect(getTableRows(page)).toHaveCount(0);
  });

  test('should filter alerts by the status', async ({ page, apiServices, kbnClient }) => {
    const tag = `outcome-filter-${Date.now()}`;

    const normalRule = await apiServices.alerting.rules.create({
      ...makeEsQueryRule('normal'),
      tags: [tag],
    });
    createdRuleIds.push(normalRule.data.id);

    const failRule = await createFailingRule(kbnClient, `fail-${Date.now()}`, [tag]);
    createdRuleIds.push(failRule.id);

    await Promise.all([
      runRuleSoon(kbnClient, normalRule.data.id),
      runRuleSoon(kbnClient, failRule.id),
    ]);

    // Wait until the failing rule shows 'Failed' last run outcome
    await expect(async () => {
      await refreshRulesList(page);
      await searchRules(page, tag);
      await page.testSubj.click('ruleLastRunOutcomeFilterButton');
      await page.testSubj.click('ruleLastRunOutcomefailedFilterOption');
      await page
        .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
        .waitFor({ timeout: 5_000 });
      await expect(getTableRows(page)).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 60_000, intervals: [3_000] });

    await expect(getTableRows(page)).toHaveCount(1);
  });

  test('should display total alerts by status and error banner only when exists alerts with status error', async ({
    page,
    apiServices,
    kbnClient,
  }) => {
    const tag = `error-banner-${Date.now()}`;

    const normalRule = await apiServices.alerting.rules.create({
      ...makeEsQueryRule('normal'),
      tags: [tag],
    });
    createdRuleIds.push(normalRule.data.id);
    await runRuleSoon(kbnClient, normalRule.data.id);

    // Wait for normal rule to succeed
    await expect(async () => {
      await refreshRulesList(page);
      await searchRules(page, tag);
      await expect(page.testSubj.locator('totalSucceededRulesCount')).toContainText(
        'Succeeded: 1',
        {
          timeout: 3_000,
        }
      );
    }).toPass({ timeout: 60_000, intervals: [3_000] });

    // No error banner before any failures
    await expect(page.testSubj.locator('rulesErrorBanner')).toHaveCount(0);

    const failRule = await createFailingRule(kbnClient, `fail-${Date.now()}`, [tag]);
    createdRuleIds.push(failRule.id);
    await runRuleSoon(kbnClient, failRule.id);

    // Wait until error banner and status counts update
    await expect(async () => {
      await refreshRulesList(page);
      await searchRules(page, tag);
      await expect(page.testSubj.locator('rulesErrorBanner')).toBeVisible({ timeout: 3_000 });
      await expect(page.testSubj.locator('rulesErrorBanner')).toContainText(
        'Error found in 1 rule. Show rule with error',
        { timeout: 3_000 }
      );
      await expect(page.testSubj.locator('totalRulesCount')).toContainText('2 rules', {
        timeout: 3_000,
      });
      await expect(page.testSubj.locator('totalSucceededRulesCount')).toContainText(
        'Succeeded: 1',
        {
          timeout: 3_000,
        }
      );
      await expect(page.testSubj.locator('totalFailedRulesCount')).toContainText('Failed: 1', {
        timeout: 3_000,
      });
      await expect(page.testSubj.locator('totalWarningRulesCount')).toContainText('Warning: 0', {
        timeout: 3_000,
      });
    }).toPass({ timeout: 60_000, intervals: [3_000] });
  });

  test('Expand error in rules table when there is rule with an error associated', async ({
    page,
    apiServices,
    kbnClient,
  }) => {
    const tag = `expand-error-${Date.now()}`;

    const normalRule = await apiServices.alerting.rules.create({
      ...makeEsQueryRule('normal'),
      tags: [tag],
    });
    createdRuleIds.push(normalRule.data.id);
    await runRuleSoon(kbnClient, normalRule.data.id);

    // Wait for normal rule to execute — no expand error link yet
    await expect(async () => {
      await refreshRulesList(page);
      await searchRules(page, tag);
      await expect(getTableRows(page)).toHaveCount(1, { timeout: 3_000 });
      await expect(page.testSubj.locator('expandRulesError')).toHaveCount(0);
    }).toPass({ timeout: 60_000, intervals: [3_000] });

    const failRule = await createFailingRule(kbnClient, `fail-${Date.now()}`, [tag]);
    createdRuleIds.push(failRule.id);
    await runRuleSoon(kbnClient, failRule.id);

    // Wait until the expand error link appears
    await expect(async () => {
      await refreshRulesList(page);
      await searchRules(page, tag);
      await expect(page.testSubj.locator('expandRulesError')).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000, intervals: [3_000] });

    // Expand and verify error details
    await page.testSubj.click('expandRulesError');
    const expandedRow = page.locator('.euiTableRow-isExpandedRow');
    await expect(expandedRow).toBeVisible();
    await expect(expandedRow).toContainText('Error from last run');
  });

  test('should filter alerts by the alert type', async ({ page, apiServices }) => {
    const uniqueTag = `type-filter-${Date.now()}`;
    const [rEsQuery, rIndexThreshold] = await Promise.all([
      apiServices.alerting.rules.create({ ...makeEsQueryRule('esq'), tags: [uniqueTag] }),
      apiServices.alerting.rules.create({
        name: `idx-thresh-${Date.now()}`,
        ruleTypeId: '.index-threshold',
        consumer: 'alerts',
        enabled: true,
        schedule: { interval: '1m' },
        actions: [],
        tags: [uniqueTag],
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000],
          index: ['.kibana'],
          timeField: 'updated_at',
        },
      }),
    ]);
    createdRuleIds.push(rEsQuery.data.id, rIndexThreshold.data.id);

    await refreshRulesList(page);
    await searchRules(page, uniqueTag);
    await expect(getTableRows(page)).toHaveCount(2);

    await page.testSubj.click('ruleTypeFilterButton');
    await expect(page.testSubj.locator('ruleType.es-queryFilterOption')).toBeVisible();
    await page.testSubj.click('ruleType.es-queryFilterOption');
    await page.testSubj.click('ruleTypeFilterButton'); // close dropdown

    await expect(getTableRows(page)).toHaveCount(1);
    await expect(
      page.testSubj.locator(`rulesListTableRowName-${rEsQuery.data.name}`)
    ).toBeVisible();
  });

  test('should filter alerts by the action type', async ({ page, apiServices, kbnClient }) => {
    const slackConnector = await createSlackConnector(
      kbnClient,
      `slack-action-filter-${Date.now()}`
    );
    createdConnectorIds.push(slackConnector.id);

    const uniqueTag = `action-filter-${Date.now()}`;
    const [rNoAction, rWithSlack] = await Promise.all([
      apiServices.alerting.rules.create({ ...makeEsQueryRule('no-action'), tags: [uniqueTag] }),
      apiServices.alerting.rules.create({
        ...makeEsQueryRule('with-slack'),
        tags: [uniqueTag],
        actions: [
          {
            id: slackConnector.id,
            group: 'query matched',
            params: { message: 'scout test' },
            // Scout type uses notifyWhen but the REST API requires notify_when (no transform).
            frequency: { summary: false, notify_when: 'onActionGroupChange' } as any,
          },
        ],
      }),
    ]);
    createdRuleIds.push(rNoAction.data.id, rWithSlack.data.id);

    await refreshRulesList(page);
    await searchRules(page, uniqueTag);
    await expect(getTableRows(page)).toHaveCount(2);

    await page.testSubj.click('actionTypeFilterButton');
    await page.testSubj.click('actionType.slackFilterOption');

    await expect(getTableRows(page)).toHaveCount(1);
    await expect(
      page.testSubj.locator(`rulesListTableRowName-${rWithSlack.data.name}`)
    ).toBeVisible();

    // Navigate away and back (matching FTR pattern) so the dropdown re-opens fresh.
    await refreshRulesList(page);

    // De-select the action type filter
    await page.testSubj.click('actionTypeFilterButton');
    await page.testSubj.click('actionType.slackFilterOption');
    await expect(page.testSubj.locator('centerJustifiedSpinner')).toBeHidden();
  });

  test('should filter alerts by the rule status', async ({ page, apiServices, kbnClient }) => {
    // Five scenarios, each re-establishing the baseline and toggling then clearing
    // several filters with bounded retries — exceeds the 60s default test timeout.
    test.setTimeout(180_000);
    const uniqueTag = `status-filter-${Date.now()}`;
    const makeRule = (prefix: string) =>
      apiServices.alerting.rules.create({ ...makeEsQueryRule(prefix), tags: [uniqueTag] });

    const [rEnabled, rDisabled, rSnoozed, rSnoozedDisabled] = await Promise.all([
      makeRule('status-enabled'),
      makeRule('status-disabled'),
      makeRule('status-snoozed'),
      makeRule('status-snoozed-disabled'),
    ]);
    createdRuleIds.push(
      rEnabled.data.id,
      rDisabled.data.id,
      rSnoozed.data.id,
      rSnoozedDisabled.data.id
    );

    await disableRule(kbnClient, rDisabled.data.id);
    await snoozeRule(kbnClient, rSnoozed.data.id);
    await snoozeRule(kbnClient, rSnoozedDisabled.data.id);
    await disableRule(kbnClient, rSnoozedDisabled.data.id);

    await refreshRulesList(page);
    await searchRules(page, uniqueTag);
    await expect(getTableRows(page)).toHaveCount(4);

    const optionsPanel = page.testSubj.locator('ruleStatusFilterSelect');
    const activeFilterBadge = page.testSubj
      .locator('ruleStatusFilterButton')
      .locator('.euiFilterButton__notification');

    // Toggle one option per freshly-opened popover. Clicking several options in a
    // single popover session is racy: the first toggle triggers a table refetch +
    // re-render and the next click can land mid-render and be swallowed (badge
    // stuck). A fresh popover means EUI derives option state from the latest
    // selectedStatuses and the click lands on a stable list. Asserting the badge
    // count after each toggle confirms it registered before moving on.
    // A single option click is still occasionally swallowed (the EuiSelectable
    // list isn't interactive the instant the popover renders, or a prior toggle's
    // refetch interferes), leaving the badge unchanged. Retry the whole
    // open→click→close cycle until the badge reaches the expected count. A lost
    // click has no effect, so re-clicking just toggles correctly; the inner
    // timeout is generous enough that a registered click is never double-toggled.
    const toggleOption = async (filterSubj: string, expectedBadge: number) => {
      await expect(async () => {
        await expect(optionsPanel).toBeHidden();
        await page.testSubj.click('ruleStatusFilterButton');
        await expect(optionsPanel).toBeVisible();
        await page.testSubj.click(filterSubj);
        await page.keyboard.press('Escape');
        await expect(optionsPanel).toBeHidden();
        await expect(activeFilterBadge).toHaveText(String(expectedBadge), { timeout: 5_000 });
      }).toPass({ timeout: 30_000 });
    };

    const applyFilters = async (
      filterSubjs: string[],
      expectedSelectedCount: number,
      expectedRowCount: number
    ) => {
      await refreshRulesList(page);
      await searchRules(page, uniqueTag);
      await expect(getTableRows(page)).toHaveCount(4);

      for (const [index, filterSubj] of filterSubjs.entries()) {
        await toggleOption(filterSubj, index + 1);
      }

      await expect(activeFilterBadge).toHaveText(String(expectedSelectedCount));
      await expect(getTableRows(page)).toHaveCount(expectedRowCount);

      // Status filters persist in localStorage + the URL, so refreshRulesList does
      // NOT reset them — deselect everything here so the next call starts from a
      // clean, unfiltered baseline (badge back to 0).
      for (const [index, filterSubj] of filterSubjs.entries()) {
        await toggleOption(filterSubj, filterSubjs.length - index - 1);
      }
      await expect(activeFilterBadge).toHaveText('0');
    };

    // Select only enabled → 2 rules (enabled + snoozed)
    await applyFilters(['ruleStatusFilterOption-enabled'], 1, 2);
    // Select only disabled → 2 rules (disabled + snoozed disabled)
    await applyFilters(['ruleStatusFilterOption-disabled'], 1, 2);
    // Select snoozed → only snoozed (2)
    await applyFilters(['ruleStatusFilterOption-snoozed'], 1, 2);
    // Select disabled + snoozed → 3 rules
    await applyFilters(['ruleStatusFilterOption-snoozed', 'ruleStatusFilterOption-disabled'], 2, 3);
    // Select enabled + disabled + snoozed → all 4
    await applyFilters(
      [
        'ruleStatusFilterOption-enabled',
        'ruleStatusFilterOption-disabled',
        'ruleStatusFilterOption-snoozed',
      ],
      3,
      4
    );

    await expect(optionsPanel).toBeHidden();
  });

  test('should filter alerts by the tag', async ({ page, apiServices }) => {
    const p = `t-${Date.now()}`;
    const tagA = `${p}-a`;
    const tagB = `${p}-b`;
    const tagC = `${p}-c`;

    const rules = await Promise.all([
      apiServices.alerting.rules.create({ ...makeEsQueryRule(`${p}-1`), tags: [tagA] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule(`${p}-2`), tags: [tagB] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule(`${p}-3`), tags: [tagA, tagB] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule(`${p}-4`), tags: [tagB, tagC] }),
      apiServices.alerting.rules.create({ ...makeEsQueryRule(`${p}-5`), tags: [tagC] }),
    ]);
    rules.forEach((r) => createdRuleIds.push(r.data.id));

    await refreshRulesList(page);
    await searchRules(page, p);
    await expect(getTableRows(page)).toHaveCount(5);

    await page.testSubj.click('ruleTagFilter');

    // Select A → 2 rules
    await page.testSubj.click(`ruleTagFilterOption-${tagA}`);
    await page
      .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
      .waitFor();
    await expect(getTableRows(page)).toHaveCount(2);

    // Deselect A → all 5
    await page.testSubj.click(`ruleTagFilterOption-${tagA}`);
    await page
      .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
      .waitFor();
    await expect(getTableRows(page)).toHaveCount(5);

    // Select A + B → 4 rules
    await page.testSubj.click(`ruleTagFilterOption-${tagA}`);
    await page.testSubj.click(`ruleTagFilterOption-${tagB}`);
    await page
      .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
      .waitFor();
    await expect(getTableRows(page)).toHaveCount(4);

    // Deselect A, B; select C → 2 rules
    await page.testSubj.click(`ruleTagFilterOption-${tagA}`);
    await page.testSubj.click(`ruleTagFilterOption-${tagB}`);
    await page.testSubj.click(`ruleTagFilterOption-${tagC}`);
    await page
      .locator('.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)')
      .waitFor();
    await expect(getTableRows(page)).toHaveCount(2);
  });

  test('should not prevent rules with action execution capabilities from being edited', async ({
    page,
    apiServices,
    kbnClient,
  }) => {
    const slackConnector = await createSlackConnector(kbnClient, `slack-edit-cap-${Date.now()}`);
    createdConnectorIds.push(slackConnector.id);

    const rule = await apiServices.alerting.rules.create({
      ...makeEsQueryRule('edit-cap'),
      actions: [
        {
          id: slackConnector.id,
          group: 'query matched',
          params: { message: 'scout test' },
          // Scout type uses notifyWhen but the REST API requires notify_when (no transform).
          frequency: { summary: false, notify_when: 'onActionGroupChange' } as any,
        },
      ],
    });
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await expect(page.testSubj.locator('selectActionButton')).toBeEnabled();
  });

  test('should untrack disable rule if untrack switch is true', async ({
    page,
    kbnClient,
    esClient,
  }) => {
    // Up to 60s waiting for the alert to fire + up to 60s waiting for untracking,
    // plus UI steps — exceeds the 60s default test timeout.
    test.setTimeout(150_000);
    const rule = await createAlwaysFiringRule(kbnClient, `untrack-true-${Date.now()}`);
    createdRuleIds.push(rule.id);
    await runRuleSoon(kbnClient, rule.id);

    // Wait for the rule to fire and create a tracked alert instance. Refresh the
    // alerts index on each poll so the active alert is searchable before we
    // disable: untracking-on-disable is an update-by-query that must find the
    // alert, otherwise the server logs "Failed to untrack 1 of 1", gives up after
    // its retries, and the alert stays tracked (no later re-attempt once disabled).
    await expect(async () => {
      await esClient.indices.refresh({ index: '.alerts-stack.alerts-default' }, { ignore: [404] });
      const summary = await getAlertSummary(kbnClient, rule.id);
      if (!summary.alerts['query matched']?.tracked) {
        throw new Error('Alert instance not yet tracked');
      }
    }).toPass({ timeout: 60_000, intervals: [2_000] });

    await refreshRulesList(page);
    await searchRules(page, rule.name);

    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('disableButton');

    // Untrack modal appears — toggle switch to enable untracking
    await expect(page.testSubj.locator('untrackAlertsModal')).toBeVisible({ timeout: 5_000 });
    await page.testSubj.click('untrackAlertsModalSwitch');
    await page.testSubj
      .locator('untrackAlertsModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();

    // Alert instance should now be untracked. Untracking on disable is processed
    // asynchronously (alert doc update + index refresh), so allow the same budget
    // as the initial "became tracked" wait — 30s is too tight on a loaded CI agent.
    await expect(async () => {
      const summary = await getAlertSummary(kbnClient, rule.id);
      const instance = summary.alerts['query matched'];
      if (!instance || instance.tracked !== false) {
        throw new Error('Alert instance still tracked');
      }
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should not untrack disable rule if untrack switch if false', async ({
    page,
    kbnClient,
  }) => {
    // Up to 60s waiting for the alert to fire plus UI steps — exceeds the 60s
    // default test timeout.
    test.setTimeout(150_000);
    const rule = await createAlwaysFiringRule(kbnClient, `untrack-false-${Date.now()}`);
    createdRuleIds.push(rule.id);
    await runRuleSoon(kbnClient, rule.id);

    // Wait for the rule to fire and create a tracked alert instance
    await expect(async () => {
      const summary = await getAlertSummary(kbnClient, rule.id);
      if (!summary.alerts['query matched']?.tracked) {
        throw new Error('Alert instance not yet tracked');
      }
    }).toPass({ timeout: 60_000, intervals: [2_000] });

    await refreshRulesList(page);
    await searchRules(page, rule.name);

    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('disableButton');

    // Untrack modal appears — do NOT toggle switch (default is untrack=false)
    await expect(page.testSubj.locator('untrackAlertsModal')).toBeVisible({ timeout: 5_000 });
    await page.testSubj
      .locator('untrackAlertsModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();

    // Alert instance should remain tracked
    await expect(async () => {
      const summary = await getAlertSummary(kbnClient, rule.id);
      const instance = summary.alerts['query matched'];
      if (!instance || instance.tracked !== true) {
        throw new Error('Alert instance unexpectedly untracked');
      }
    }).toPass({ timeout: 30_000, intervals: [2_000] });
  });

  test('should allow rules to be snoozed using the right side dropdown', async ({
    page,
    apiServices,
  }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('snooze-dropdown'));
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('snoozeButton');
    await page.testSubj.click('ruleSnoozeApply');

    await expect(page.testSubj.locator('rulesListNotifyBadge-snoozed')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should allow rules to be snoozed indefinitely using the right side dropdown', async ({
    page,
    apiServices,
  }) => {
    const rule = await apiServices.alerting.rules.create(
      makeEsQueryRule('snooze-indefinite-dropdown')
    );
    createdRuleIds.push(rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await page.testSubj.click('collapsedItemActions');
    await page.testSubj.click('snoozeButton');
    await page.testSubj.click('ruleSnoozeIndefiniteApply');

    await expect(page.testSubj.locator('rulesListNotifyBadge-snoozedIndefinitely')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should allow snoozed rules to be unsnoozed using the right side dropdown', async ({
    page,
    apiServices,
    kbnClient,
  }) => {
    const rule = await apiServices.alerting.rules.create(makeEsQueryRule('unsnooze-dropdown'));
    createdRuleIds.push(rule.data.id);
    await snoozeRule(kbnClient, rule.data.id);

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    const ruleRow = page
      .locator('[data-test-subj^="rule-row"]')
      .filter({ has: page.testSubj.locator(`rulesListTableRowName-${rule.data.name}`) });
    await ruleRow.locator('[data-test-subj="collapsedItemActions"]').click();
    await page.testSubj.click('snoozeButton');
    await page.testSubj.click('ruleSnoozeCancel');

    await refreshRulesList(page);
    await searchRules(page, rule.data.name as string);

    await expect(ruleRow.locator('[data-test-subj="rulesListNotifyBadge-snoozed"]')).toBeHidden();
    await expect(
      ruleRow.locator('[data-test-subj="rulesListNotifyBadge-snoozedIndefinitely"]')
    ).toBeHidden();
  });
});
