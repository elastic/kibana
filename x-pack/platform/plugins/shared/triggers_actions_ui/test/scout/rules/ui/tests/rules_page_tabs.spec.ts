/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const RULES_LIST_SUBJ = 'rulesList';
const LOGS_LINK_SUBJ = 'rulesLogsLink';

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

  test.afterAll(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
    }
  });

  test('navigate to the Rules list and Logs page', async ({ page, browserAuth, pageObjects }) => {
    await test.step('navigates to the Rules page', async () => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('rules');
      await page.waitForURL(RULES_URL_RE);
    });

    await test.step('selects the Rules list by default on load', async () => {
      expect(page.url()).toMatch(RULES_URL_RE);
      expect(page.url()).not.toMatch(LOGS_URL_RE);
      await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
    });

    await test.step('shows the Logs link in the app menu when the user has permission', async () => {
      await pageObjects.appMenu.openOverflow();
      await expect(page.testSubj.locator(LOGS_LINK_SUBJ)).toBeVisible();
    });

    await test.step('navigates to Logs via the app menu', async () => {
      await pageObjects.appMenu.clickItem(LOGS_LINK_SUBJ);
      await page.waitForURL(LOGS_URL_RE);
      expect(page.url()).toMatch(LOGS_URL_RE);
    });

    await test.step('navigates back to the rules list', async () => {
      await page.testSubj.click(APP_HEADER_TEST_SUBJECTS.back);
      await page.waitForURL(RULES_URL_RE);
      expect(page.url()).not.toMatch(LOGS_URL_RE);
      await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
    });
  });
});
