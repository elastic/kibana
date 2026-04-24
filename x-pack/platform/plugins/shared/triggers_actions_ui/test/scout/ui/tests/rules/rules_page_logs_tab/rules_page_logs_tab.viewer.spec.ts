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

test.describe(
  'Rules Page - Logs Tab - Viewer',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await seedRulesForTests(apiServices);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.rulesPage.goto();
      await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
    });

    test.afterAll(async ({ apiServices }) => {
      for (const name of Object.values(RULE_NAMES)) {
        const id = await getRuleIdByName(apiServices, name);
        if (id) {
          await apiServices.alerting.rules.delete(id).catch(() => {});
        }
      }
    });

    test('should navigate to logs tab and display event log table', async ({ pageObjects }) => {
      await pageObjects.rulesPage.clickLogsTab();

      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();
      await pageObjects.rulesPage.expectLogsTabActive();
    });

    test('should load logs tab content when navigating directly via URL', async ({
      pageObjects,
    }) => {
      await pageObjects.rulesPage.gotoLogsTab();

      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();
    });

    test('should persist logs tab selection in URL', async ({ page, pageObjects }) => {
      await pageObjects.rulesPage.clickLogsTab();

      const url = page.url();
      expect(url).toContain('logs');
    });

    test('should navigate to rule details when clicking on a rule in event logs', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.rulesPage.clickLogsTab();

      await pageObjects.rulesPage.waitForLogsTableToLoad();

      const ruleLinks = await pageObjects.rulesPage.getLogsTableRuleLinks(
        RULE_NAMES.FIRST_RULE_TEST
      );
      expect(ruleLinks.length).toBeGreaterThan(0);
      await pageObjects.rulesPage.clickOnRuleInEventLogs(ruleLinks[0]);

      await page.waitForURL(/\/app\/rules\/rule\//);
      await expect(pageObjects.rulesPage.ruleDetails).toBeVisible();
    });
  }
);
