/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Rules list bulk actions respect active filters',
  { tag: '@local-stateful-classic' },
  () => {
    const tagA = 'scout-bulk-filter-a';
    const tagB = 'scout-bulk-filter-b';
    const ruleIdsA: string[] = [];
    const ruleIdsB: string[] = [];

    test.beforeAll(async ({ apiServices }) => {
      // Reset to a clean state — rules linger across spec files in the same worker.
      await apiServices.alertingV2.rules.cleanUp();

      for (let i = 0; i < 2; i++) {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({ metadata: { name: `scout-bulk-A-${i}`, tags: [tagA] } })
        );
        ruleIdsA.push(rule.id);
      }
      for (let i = 0; i < 2; i++) {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({ metadata: { name: `scout-bulk-B-${i}`, tags: [tagB] } })
        );
        ruleIdsB.push(rule.id);
      }
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
    });

    test('bulk disable applies only to rules matching the list filter, not the full space', async ({
      browserAuth,
      page,
      pageObjects,
      apiServices,
    }) => {
      await test.step('precondition: all seed rules are enabled', async () => {
        for (const id of [...ruleIdsA, ...ruleIdsB]) {
          const rule = await apiServices.alertingV2.rules.get(id);
          expect(rule.enabled).toBe(true);
        }
      });

      await test.step('open rules list and filter by tag A', async () => {
        await browserAuth.loginAsAlertingV2Editor();
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible();
        await pageObjects.rulesList.filterBySingleTag(tagA);
      });

      await test.step('filtered list shows tag A rules only', async () => {
        // Initial filter application can be slow on a freshly-booted Kibana
        // before the rules list re-renders with the filtered set.
        await expect(pageObjects.rulesList.rowCheckbox(ruleIdsA[0])).toBeVisible({
          timeout: 60_000,
        });
        await expect(pageObjects.rulesList.rowCheckbox(ruleIdsA[1])).toBeVisible();
        await expect(page.testSubj.locator(`checkboxSelectRow-${ruleIdsB[0]}`)).toHaveCount(0);
        await expect(page.testSubj.locator(`checkboxSelectRow-${ruleIdsB[1]}`)).toHaveCount(0);
      });

      await test.step('select all filtered rules and bulk disable', async () => {
        await pageObjects.rulesList.rowCheckbox(ruleIdsA[0]).click();
        await expect(pageObjects.rulesList.selectAllRulesButton).toBeVisible();
        await pageObjects.rulesList.selectAllRulesButton.click();
        await expect(pageObjects.rulesList.selectAllRulesButton).toBeHidden();
        await pageObjects.rulesList.bulkActionsButton.click();
        await pageObjects.rulesList.bulkDisableMenuItem.click();
      });

      await test.step('tag A rules are disabled; tag B rules stay enabled', async () => {
        // Bulk disable propagates asynchronously through task manager; allow
        // up to 60s for the rule SOs to reflect the new enabled state.
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleIdsA[0])).enabled, {
            timeout: 60_000,
          })
          .toBe(false);
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleIdsA[1])).enabled)
          .toBe(false);
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleIdsB[0])).enabled)
          .toBe(true);
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleIdsB[1])).enabled)
          .toBe(true);
      });
    });
  }
);
