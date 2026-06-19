/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/shared/global_rule_event_log_list.ts
//
// Drives the GlobalRuleEventLogList shareable component rendered by the
// triggersActionsUiExample dev plugin (filteredRuleTypes: apm.error_rate +
// apm.transaction_error_rate). Verifies the component loads, filters out
// non-matching rule types, and respects the active space until the
// "show all spaces" switch is toggled.
//
// The FTR `test.noop` rule (created to prove non-apm rules are filtered out) is
// substituted with `.es-query`, which is registered in Scout's stateful config.

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const EXAMPLE_APP_PATH = '/app/triggersActionsUiExample/global_rule_event_log_list';
const SPACE_2 = 'space-2';

// Row data cells carry both data-gridcell-row-index and data-gridcell-column-id;
// the row-index attribute excludes the column header from the match.
const RULE_NAME_CELL = '[data-gridcell-row-index][data-gridcell-column-id="rule_name"]';

const APM_ERROR_RATE_RULE = {
  name: 'Error count threshold',
  ruleTypeId: 'apm.error_rate',
  consumer: 'alerts',
  schedule: { interval: '1m' },
  params: { threshold: 25, windowSize: 5, windowUnit: 'm', environment: 'ENVIRONMENT_ALL' },
};

const APM_TRANSACTION_RULE = {
  name: 'Failed transaction',
  ruleTypeId: 'apm.transaction_error_rate',
  consumer: 'alerts',
  schedule: { interval: '1m' },
  params: { threshold: 30, windowSize: 5, windowUnit: 'm', environment: 'ENVIRONMENT_ALL' },
};

const ES_QUERY_RULE = {
  name: 'test-rule',
  ruleTypeId: '.es-query',
  consumer: 'stackAlerts',
  schedule: { interval: '1m' },
  params: {
    searchType: 'esQuery' as const,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [0],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{"query":{"match_all":{}}}',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: 'updated_at',
  },
};

test.describe('Global rule event log list', { tag: ['@local-stateful-classic'] }, () => {
  let apmErrorRateRuleId: string;
  let apmTransactionRuleId: string;
  let esQueryRuleId: string;

  test.beforeAll(async ({ apiServices }) => {
    test.setTimeout(180_000);

    await apiServices.spaces.create({ id: SPACE_2, name: 'Space 2' });

    apmErrorRateRuleId = (await apiServices.alerting.rules.create(APM_ERROR_RATE_RULE)).data.id;
    apmTransactionRuleId = (await apiServices.alerting.rules.create(APM_TRANSACTION_RULE, SPACE_2))
      .data.id;
    esQueryRuleId = (await apiServices.alerting.rules.create(ES_QUERY_RULE)).data.id;

    // Each rule must execute at least once to surface in the global event log.
    const dateStart = new Date();
    await apiServices.alerting.rules.runSoon(apmErrorRateRuleId);
    await apiServices.alerting.rules.runSoon(apmTransactionRuleId, SPACE_2);
    await apiServices.alerting.rules.runSoon(esQueryRuleId);

    await apiServices.alerting.waiting.waitForExecutionCount(
      apmErrorRateRuleId,
      1,
      undefined,
      90_000,
      dateStart
    );
    await apiServices.alerting.waiting.waitForExecutionCount(
      apmTransactionRuleId,
      1,
      SPACE_2,
      90_000,
      dateStart
    );
    await apiServices.alerting.waiting.waitForExecutionCount(
      esQueryRuleId,
      1,
      undefined,
      90_000,
      dateStart
    );
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled([
      apmErrorRateRuleId ? apiServices.alerting.rules.delete(apmErrorRateRuleId) : undefined,
      apmTransactionRuleId
        ? apiServices.alerting.rules.delete(apmTransactionRuleId, SPACE_2)
        : undefined,
      esQueryRuleId ? apiServices.alerting.rules.delete(esQueryRuleId) : undefined,
    ]);
    await apiServices.spaces.delete(SPACE_2);
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(EXAMPLE_APP_PATH));
    await expect(page.testSubj.locator('ruleEventLogListTable')).toBeVisible({ timeout: 30_000 });
  });

  test('loads the shareable component with the all-spaces switch', async ({ page }) => {
    await expect(page.testSubj.locator('ruleEventLogListTable')).toBeVisible();
    await expect(page.testSubj.locator('showAllSpacesSwitch')).toBeVisible();
  });

  test('filters rule types via filteredRuleTypes and respects the active space', async ({
    page,
  }) => {
    const ruleNameCells = page.locator(RULE_NAME_CELL);

    // Each data-grid cell's innerText carries a trailing sort-affordance icon char
    // (e.g. "Error count threshold\n↦"); strip trailing non-alphanumeric chars.
    const ruleNamesInGrid = async () =>
      new Set(
        (await ruleNameCells.allInnerTexts()).map((t) => t.replace(/[^a-zA-Z0-9\s]+$/, '').trim())
      );

    // Default space only: the apm.error_rate rule passes filteredRuleTypes; the
    // space-2 apm rule is out of scope and the es-query rule is filtered out.
    await expect(async () => {
      const names = await ruleNamesInGrid();
      expect(names.has('Error count threshold')).toBe(true);
      expect(names.has('Failed transaction')).toBe(false);
      expect(names.has('test-rule')).toBe(false);
    }).toPass({ timeout: 60_000 });

    await page.testSubj.locator('showAllSpacesSwitch').locator('button').click();

    // With all spaces shown, the space-2 apm rule appears too; the es-query rule
    // stays filtered out by filteredRuleTypes.
    await expect(async () => {
      const names = await ruleNamesInGrid();
      expect(names.has('Error count threshold')).toBe(true);
      expect(names.has('Failed transaction')).toBe(true);
      expect(names.has('test-rule')).toBe(false);
    }).toPass({ timeout: 60_000 });
  });
});
