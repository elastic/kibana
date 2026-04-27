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

// `.es-query` is built-in (Scout's stateful/classic config does not register
// the FTR-only `test.noop` rule type the deleted spec used). The rule itself
// only needs to exist so the rules list has at least one row to render.
const makeEsQueryRule = () => ({
  name: `scout-page-nav-rule-${Date.now()}`,
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
  tags: ['scout-page-navigation'],
});

test.describe('Rules page navigation and loading', { tag: tags.stateful.classic }, () => {
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

  test('navigates to /app/rules successfully', async ({ page }) => {
    expect(page.url()).toContain('/app/rules');
  });

  test('loads with the correct page title', async ({ page }) => {
    await expect(page.testSubj.locator('appTitle')).toHaveText('Rules');
  });

  test('displays the rules list', async ({ page }) => {
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });

  test('finishes loading and shows the rules list', async ({ page }) => {
    // The original FTR test waited for the loading spinner to disappear by
    // calling `header.waitUntilLoadingHasFinished()`, then asserted on the
    // rules list. Playwright auto-waits on the locator below until the row
    // is in a stable rendered state, which subsumes the "spinner gone"
    // intent — the rules list is only rendered after loading completes.
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });
});
