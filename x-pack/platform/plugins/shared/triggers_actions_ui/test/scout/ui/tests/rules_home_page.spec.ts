/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const RULES_APP = 'rules';
const APP_TITLE_SUBJ = 'appTitle';
const RULES_LIST_SUBJ = 'rulesList';
const RULES_TAB_SUBJ = 'rulesTab';

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
    const ruleResponse = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-home-page')
    );
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
    const ruleResponse = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-home-page')
    );
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
