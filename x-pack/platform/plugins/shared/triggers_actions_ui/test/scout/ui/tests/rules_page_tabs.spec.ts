/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const RULES_LIST_SUBJ = 'rulesList';
const RULES_TAB_SUBJ = 'rulesTab';
const LOGS_TAB_SUBJ = 'logsTab';

const RULES_URL_RE = /\/app\/rules(\/|$|\?|#)/;
const LOGS_URL_RE = /\/app\/rules\/logs(\/|$|\?|#)/;

// `.es-query` is built-in. The original FTR spec used `test.noop`, which
// Scout's stateful/classic config does not register. The rule's only purpose
// is to ensure the rules list has at least one row to render.
const makeEsQueryRule = () => ({
  name: `scout-tab-functionality-rule-${Date.now()}`,
  ruleTypeId: '.es-query',
  consumer: 'stackAlerts',
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
    timeField: '@timestamp',
  },
  schedule: { interval: '1m' },
  tags: ['scout-tab-functionality'],
});

test.describe('Rules page tab functionality', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(makeEsQueryRule());
    createdRuleId = response.data.id;
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterAll(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
    }
  });

  test('selects the Rules tab by default on load', async ({ page }) => {
    expect(page.url()).toMatch(RULES_URL_RE);
    expect(page.url()).not.toContain('/app/rules/logs');
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });

  test('shows the Logs tab when the user has permission', async ({ page }) => {
    await expect(page.testSubj.locator(LOGS_TAB_SUBJ)).toBeVisible();
  });

  test('navigates to /app/rules/logs when clicking the Logs tab', async ({ page }) => {
    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);
    expect(page.url()).toContain('/app/rules/logs');
  });

  test('navigates back to /app/rules when clicking the Rules tab', async ({ page }) => {
    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);

    await page.testSubj.click(RULES_TAB_SUBJ);
    await page.waitForURL(RULES_URL_RE);
    expect(page.url()).not.toContain('/app/rules/logs');
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });

  test('updates the URL correctly when switching back and forth between tabs', async ({ page }) => {
    // Start on Rules
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();

    // Rules → Logs
    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);

    // Logs → Rules
    await page.testSubj.click(RULES_TAB_SUBJ);
    await page.waitForURL(RULES_URL_RE);
    expect(page.url()).not.toContain('/app/rules/logs');
  });
});
