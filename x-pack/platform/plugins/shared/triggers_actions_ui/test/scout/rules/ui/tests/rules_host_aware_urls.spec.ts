/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  CLASSIC_RULES_CREATE_URL_RE,
  CLASSIC_RULES_DETAILS_URL_RE,
  CLASSIC_RULES_EDIT_URL_RE,
  CLASSIC_RULES_LIST_URL_RE,
  CLASSIC_RULES_LOGS_URL_RE,
  CLASSIC_RULES_NESTED_RULES_URL_RE,
  MANAGEMENT_ALERTING_V2_URL_RE,
  STANDALONE_RULES_APP_URL_RE,
  makeEsQueryRule,
  test,
} from '../fixtures';

const expectManagementHost = async (page: ScoutPage, pathRe: RegExp) => {
  await expect(page).toHaveURL(pathRe);
  await expect(page).not.toHaveURL(CLASSIC_RULES_NESTED_RULES_URL_RE);
  await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
  await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
};

const expectManagementHref = async (locator: Locator) => {
  await expect(locator).not.toHaveAttribute('href', CLASSIC_RULES_NESTED_RULES_URL_RE);
  await expect(locator).not.toHaveAttribute('href', STANDALONE_RULES_APP_URL_RE);
  await expect(locator).not.toHaveAttribute('href', MANAGEMENT_ALERTING_V2_URL_RE);
};

/*
 * Host-aware coverage for classic v1 Rules on Stack Management.
 * Assert page URLs only after in-page clicks (or browser back/forward), never
 * after a direct goto of the URL under test.
 */
test.describe('Classic (v1) Rules host-aware URLs', { tag: tags.stateful.classic }, () => {
  let ruleId: string;
  let ruleName: string;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-v1-host-aware')
    );
    ruleId = response.data.id;
    ruleName = response.data.name as string;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleId) {
      await apiServices.alerting.rules.delete(ruleId);
    }
  });

  test('clicking a rule name stays on Stack Management', async ({ kbnUrl, page, pageObjects }) => {
    const rules = pageObjects.classicRulesPage;

    await test.step('rule-name href is host-relative, not the standalone rules app', async () => {
      await rules.openListAndSearch(kbnUrl, ruleName);
      await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });

      await expect(rules.ruleNameLink(ruleName)).toHaveAttribute(
        'href',
        /\/triggersActions\/rule\//
      );
      await expectManagementHref(rules.ruleNameLink(ruleName));
    });

    await test.step('click navigates to details on the management mount', async () => {
      await rules.clickRuleName(ruleName);
      await expect(rules.pageTitle).toBeVisible({ timeout: 30_000 });
      await expectManagementHost(page, CLASSIC_RULES_DETAILS_URL_RE);
      await expect(page).toHaveURL(new RegExp(`/rule/${ruleId}(/|$|\\?|#)`));
    });
  });

  test('back button from details returns to the management rules list', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const rules = pageObjects.classicRulesPage;
    await rules.openListAndSearch(kbnUrl, ruleName);
    await rules.clickRuleName(ruleName);
    await expect(rules.backLink).toBeVisible({ timeout: 30_000 });

    await test.step('back href stays on the management list, not /triggersActions/rules', async () => {
      await expect(rules.backLink).toHaveAttribute('href', /\/triggersActions\/?(?:\?|#|$)/);
      await expectManagementHref(rules.backLink);
    });

    await test.step('clicking back lands on the rules list', async () => {
      await rules.clickBack();
      await expect(rules.rulesList).toBeVisible();
      await expectManagementHost(page, CLASSIC_RULES_LIST_URL_RE);
    });
  });

  test('create rule type selection stays on Stack Management', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const rules = pageObjects.classicRulesPage;
    await rules.goto(kbnUrl);
    await expect(rules.createButton).toBeVisible({ timeout: 30_000 });

    await test.step('open the rule type modal and select Elasticsearch query', async () => {
      await rules.openCreateRuleTypeModal();
      await rules.selectEsQueryRuleType();
    });

    await test.step('create form URL stays on the management mount', async () => {
      await expectManagementHost(page, CLASSIC_RULES_CREATE_URL_RE);
    });

    await test.step('cancel returns to the management rules list', async () => {
      await rules.clickCancel();
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
      await expectManagementHost(page, CLASSIC_RULES_LIST_URL_RE);
    });
  });

  test('edit from the list stays on Stack Management and cancel returns to the list', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const rules = pageObjects.classicRulesPage;
    await rules.openListAndSearch(kbnUrl, ruleName);
    await expect(rules.ruleNameLink(ruleName)).toBeVisible({ timeout: 30_000 });

    await test.step('edit action opens the form on the management mount', async () => {
      await rules.openEditFromList(ruleId);
      await expectManagementHost(page, CLASSIC_RULES_EDIT_URL_RE);
      await expect(page).toHaveURL(new RegExp(`/edit/${ruleId}(/|$|\\?|#)`));
    });

    await test.step('cancel returns to the management rules list', async () => {
      await rules.clickCancel();
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
      await expectManagementHost(page, CLASSIC_RULES_LIST_URL_RE);
    });
  });

  test('rules and logs navigation stays on Stack Management', async ({
    kbnUrl,
    page,
    pageObjects,
  }) => {
    const rules = pageObjects.classicRulesPage;
    await rules.goto(kbnUrl);
    await expect(rules.rulesList).toBeVisible({ timeout: 30_000 });

    await test.step('navigate to logs and back to rules', async () => {
      await rules.openLogsFromMoreMenu();
      await expectManagementHost(page, CLASSIC_RULES_LOGS_URL_RE);

      await rules.clickBack();
      await expectManagementHost(page, CLASSIC_RULES_LIST_URL_RE);
    });

    await test.step('browser back and forward keep the management host', async () => {
      await rules.openLogsFromMoreMenu();
      await expectManagementHost(page, CLASSIC_RULES_LOGS_URL_RE);

      await page.goBack();
      await expectManagementHost(page, CLASSIC_RULES_LIST_URL_RE);
      await expect(rules.rulesList).toBeVisible();

      await page.goForward();
      await expectManagementHost(page, CLASSIC_RULES_LOGS_URL_RE);
    });
  });
});
