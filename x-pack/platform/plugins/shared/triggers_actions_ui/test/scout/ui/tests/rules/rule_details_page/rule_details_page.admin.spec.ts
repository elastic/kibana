/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { BIGGER_TIMEOUT } from '../../../fixtures/constants';
import { getRuleIdByName } from '../../../fixtures/helpers';
import { RULE_NAMES, seedRulesForTests } from '../../../fixtures/rule_seeding';

test.describe('Rule Details Page - Admin', { tag: tags.stateful.classic }, () => {
  let ruleId: string;
  let testDashboardId: string | undefined;

  test.beforeAll(async ({ apiServices }) => {
    await seedRulesForTests(apiServices);

    const foundRuleId = await getRuleIdByName(apiServices, RULE_NAMES.RULE_DETAILS_TEST);
    if (!foundRuleId) {
      throw new Error(`Rule ${RULE_NAMES.RULE_DETAILS_TEST} not found`);
    }
    ruleId = foundRuleId;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    if (testDashboardId) {
      await kbnClient.savedObjects
        .delete({
          type: 'dashboard',
          id: testDashboardId,
        })
        .catch(() => {});
    }

    for (const name of Object.values(RULE_NAMES)) {
      const id = await getRuleIdByName(apiServices, name);
      if (id) {
        await apiServices.alerting.rules.delete(id).catch(() => {});
      }
    }
  });

  test('should navigate from rules table to rule details and display page correctly', async ({
    pageObjects,
  }) => {
    await pageObjects.rulesPage.goto();
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();

    const rulesTable = pageObjects.rulesPage.rulesTable;
    const ruleLink = rulesTable.getByRole('link', { name: RULE_NAMES.RULE_DETAILS_TEST });
    await expect(ruleLink).toBeVisible();
    await ruleLink.click();

    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);
    await expect(pageObjects.ruleDetailsPage.ruleType).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.ruleStatusPanel).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.ruleDefinition).toBeVisible();
  });

  test('should load rule details page directly by URL', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);

    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);
  });

  test('should display alert summary widget on the page', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await expect(pageObjects.ruleDetailsPage.alertSummaryWidget.compact).toBeVisible();
  });

  test('should navigate to alerts tab with active filter when clicking active alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickActiveAlerts();

    const url = page.url();
    expect(url).toContain('tabId=alerts');
    expect(url).toContain('selected_options:!(active)');
    expect(url).toContain('rangeFrom:now-');
    expect(url).toContain('rangeTo:now');
  });

  test('should navigate to alerts tab with all statuses when clicking total alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickTotalAlerts();

    const url = page.url();
    expect(url).toContain('tabId=alerts');
    expect(url).toContain('selected_options:!()');
    expect(url).toContain('rangeFrom:now-');
    expect(url).toContain('rangeTo:now');
  });

  test('should show edit and delete actions for admin user', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await expect(pageObjects.ruleDetailsPage.actionsButton).toBeVisible();

    await pageObjects.ruleDetailsPage.openActionsMenu();

    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.deleteRuleButton).toBeVisible();
  });

  test('should close actions popover when clicking actions button again', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.openActionsMenu();
    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeVisible();

    await pageObjects.ruleDetailsPage.closeActionsMenu();
    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeHidden();
  });

  test('should display dashboard options in related dashboards dropdown when editing rule', async ({
    kbnClient,
    pageObjects,
  }) => {
    const testDashboardTitle = `Scout Test Dashboard for Rule Details ${Date.now()}`;

    const dashboard = await kbnClient.savedObjects.create({
      type: 'dashboard',
      overwrite: false,
      attributes: {
        title: testDashboardTitle,
        description: 'Test dashboard for rule details Scout test',
        panelsJSON: '[]',
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });
    testDashboardId = dashboard.id;

    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.openRuleEditForm();

    await expect(pageObjects.ruleDetailsPage.dashboardsSelector).toBeVisible();

    await pageObjects.ruleDetailsPage.dashboardsSelector.click();
    await expect(pageObjects.ruleDetailsPage.comboboxOptionsList).toBeAttached({
      timeout: BIGGER_TIMEOUT,
    });

    const input = pageObjects.ruleDetailsPage.dashboardsSelector.locator('input');
    const optionsLocator =
      pageObjects.ruleDetailsPage.comboboxOptionsList.locator('[role="option"]');

    // Alternate between two search values so `searchValue` changes on every poll iteration.
    // Using the same value would leave React state unchanged, so `loadDashboards` would not
    // re-fire and options might never update under ES near-real-time indexing delay.
    let toggle = false;
    await expect
      .poll(
        async () => {
          toggle = !toggle;
          await input.fill(toggle ? testDashboardTitle : testDashboardTitle.slice(0, -1));
          return optionsLocator.count();
        },
        { timeout: 30000, intervals: [1000] }
      )
      .toBeGreaterThan(0);
  });
});
