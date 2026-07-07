/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const RULES_LIST_SUBJ = 'rulesList';
const RULES_TAB_SUBJ = 'rulesTab';
const LOGS_TAB_SUBJ = 'logsTab';

const RULES_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;
const LOGS_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions\/logs(\/|$|\?|#)/;

test.describe('Rules page tab functionality', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-tab-functionality')
    );
    createdRuleId = response.data.id;
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
    await page.waitForURL(RULES_URL_RE);
  });

  test.afterAll(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
    }
  });

  test('selects the Rules tab by default on load', async ({ page }) => {
    expect(page.url()).toMatch(RULES_URL_RE);
    expect(page.url()).not.toMatch(LOGS_URL_RE);
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });

  test('shows the Logs tab when the user has permission', async ({ page }) => {
    await expect(page.testSubj.locator(LOGS_TAB_SUBJ)).toBeVisible();
  });

  test('navigates to rules logs tab when clicking the Logs tab', async ({ page }) => {
    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);
    expect(page.url()).toMatch(LOGS_URL_RE);
  });

  test('navigates back to rules list when clicking the Rules tab', async ({ page }) => {
    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);

    await page.testSubj.click(RULES_TAB_SUBJ);
    await page.waitForURL(RULES_URL_RE);
    expect(page.url()).not.toMatch(LOGS_URL_RE);
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });

  test('updates the URL correctly when switching back and forth between tabs', async ({ page }) => {
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();

    await page.testSubj.click(LOGS_TAB_SUBJ);
    await page.waitForURL(LOGS_URL_RE);

    await page.testSubj.click(RULES_TAB_SUBJ);
    await page.waitForURL(RULES_URL_RE);
    expect(page.url()).not.toMatch(LOGS_URL_RE);
  });
});
