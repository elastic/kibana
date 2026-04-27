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

const RULES_APP = 'rules';
const APP_TITLE_SUBJ = 'appTitle';
const RULES_LIST_SUBJ = 'rulesList';
const RULES_TAB_SUBJ = 'rulesTab';

// Mirrors `alerts_and_actions_role` from the FTR config.base.ts the deleted
// `home_page.ts` relied on — grants full access to alerting + connectors.
const ALERTS_AND_ACTIONS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'], stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

// Mirrors `only_actions_role` — full connectors access but NO alerting. Used
// to verify the app shows the no-permission prompt.
const ONLY_ACTIONS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'] },
      spaces: ['*'],
    },
  ],
};

// `.es-query` is built-in in the base stateful config (the FTR version used
// `test.noop` from a fixture plugin that Scout's stateful/classic does not
// load). Minimal valid params suffice — the test only asserts the rule's
// presence in the list, not its behavior.
const makeEsQueryRule = () => ({
  name: `scout-home-page-rule-${Date.now()}`,
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
  tags: ['scout-home-page'],
});

test.describe('Rules home page', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(createdRuleIds.map((id) => apiServices.alerting.rules.delete(id)));
    createdRuleIds.length = 0;
  });

  test('loads the Rules page with alerts-and-actions role', async ({ browserAuth, page }) => {
    await browserAuth.loginWithCustomRole(ALERTS_AND_ACTIONS_ROLE);
    await page.gotoApp(RULES_APP);

    await expect(page.testSubj.locator(APP_TITLE_SUBJ)).toHaveText('Rules');
  });

  test('shows the no-permission prompt when the user has actions but no alerting privilege', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(ONLY_ACTIONS_ROLE);
    await page.gotoApp(RULES_APP);

    await expect(page.testSubj.locator('noPermissionPrompt')).toBeVisible();
  });

  test('loads the Rules page as admin', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp(RULES_APP);

    await expect(page.testSubj.locator(APP_TITLE_SUBJ)).toHaveText('Rules');
  });

  test('renders the rules list with a newly-created rule visible', async ({
    apiServices,
    browserAuth,
    page,
  }) => {
    const ruleResponse = await apiServices.alerting.rules.create(makeEsQueryRule());
    const ruleId = ruleResponse.data.id;
    const ruleName = ruleResponse.data.name;
    createdRuleIds.push(ruleId);

    await browserAuth.loginAsAdmin();
    await page.gotoApp(RULES_APP);
    await page.testSubj.click(RULES_TAB_SUBJ);

    expect(page.url()).toContain('/rules');
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
    await expect(
      page.testSubj.locator(RULES_LIST_SUBJ).locator(`[title="${ruleName}"]`)
    ).toBeVisible();
  });

  test('navigates to the rule details page when clicking a rule in the list', async ({
    apiServices,
    browserAuth,
    page,
  }) => {
    const ruleResponse = await apiServices.alerting.rules.create(makeEsQueryRule());
    const ruleId = ruleResponse.data.id;
    const ruleName = ruleResponse.data.name;
    createdRuleIds.push(ruleId);

    await browserAuth.loginAsAdmin();
    await page.gotoApp(RULES_APP);
    await page.testSubj.click(RULES_TAB_SUBJ);

    await page.testSubj.locator(RULES_LIST_SUBJ).locator(`[title="${ruleName}"]`).click();

    await page.waitForURL(new RegExp(`/rule/${ruleId}(\\b|$)`));
    expect(page.url()).toContain(`/rule/${ruleId}`);
  });
});
