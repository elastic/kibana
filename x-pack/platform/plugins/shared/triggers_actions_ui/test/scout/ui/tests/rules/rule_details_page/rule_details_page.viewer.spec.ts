/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { getRuleIdByName } from '../../../fixtures/helpers';
import { RULE_NAMES, seedRulesForTests } from '../../../fixtures/rule_seeding';

test.describe('Rule Details Page - Viewer', { tag: tags.stateful.classic }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices }) => {
    await seedRulesForTests(apiServices);

    const foundRuleId = await getRuleIdByName(apiServices, RULE_NAMES.RULE_DETAILS_TEST);
    if (!foundRuleId) {
      throw new Error(`Rule ${RULE_NAMES.RULE_DETAILS_TEST} not found`);
    }
    ruleId = foundRuleId;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    for (const name of Object.values(RULE_NAMES)) {
      const id = await getRuleIdByName(apiServices, name);
      if (id) {
        await apiServices.alerting.rules.delete(id).catch(() => {});
      }
    }
  });

  test('should navigate to rule details page and display page correctly', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);

    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);
    await expect(pageObjects.ruleDetailsPage.ruleType).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.ruleStatusPanel).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.ruleDefinition).toBeVisible();
  });

  test('should display alert summary widget on the page', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await expect(pageObjects.ruleDetailsPage.alertSummaryWidget.compact).toBeVisible();
  });

  test('should navigate to alerts tab when clicking active alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickActiveAlerts();

    const url = page.url();
    expect(url).toContain('tabId=alerts');
    expect(url).toContain('selected_options:!(active)');
  });

  test('should navigate to alerts tab when clicking total alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickTotalAlerts();

    const url = page.url();
    expect(url).toContain('tabId=alerts');
    expect(url).toContain('selected_options:!()');
  });

  test('should not show actions button for viewer user', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    await expect(pageObjects.ruleDetailsPage.actionsButton).toBeHidden();
  });
});
