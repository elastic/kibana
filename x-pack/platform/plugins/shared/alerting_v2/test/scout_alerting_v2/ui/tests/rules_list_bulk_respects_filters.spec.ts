/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { tags, type KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

async function createRuleViaApi(kbnClient: KbnClient, name: string, ruleTags: string[]) {
  const res = await kbnClient.request<{ id: string }>({
    path: ALERTING_V2_RULE_API_PATH,
    method: 'POST',
    body: {
      kind: 'alert',
      metadata: { name, tags: ruleTags },
      schedule: { every: '5m' },
      evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
    },
  });
  if (res.status !== 200) {
    throw new Error(`Failed to create rule "${name}": ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.id;
}

async function getRuleEnabled(kbnClient: KbnClient, id: string): Promise<boolean> {
  const res = await kbnClient.request<{ enabled: boolean }>({
    path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(id)}`,
    method: 'GET',
  });
  if (res.status !== 200) {
    throw new Error(`Failed to load rule ${id}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.enabled;
}

async function deleteRuleViaApi(kbnClient: KbnClient, id: string) {
  await kbnClient.request({
    path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(id)}`,
    method: 'DELETE',
    ignoreErrors: [404],
  });
}

test.describe(
  'Rules list bulk actions respect active filters',
  { tag: tags.stateful.classic },
  () => {
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const tagA = `scout-bulk-filter-a-${runId}`;
    const tagB = `scout-bulk-filter-b-${runId}`;
    const ruleIdsA: string[] = [];
    const ruleIdsB: string[] = [];

    test.beforeAll(async ({ kbnClient }) => {
      for (let i = 0; i < 2; i++) {
        ruleIdsA.push(await createRuleViaApi(kbnClient, `scout-bulk-A-${runId}-${i}`, [tagA]));
      }
      for (let i = 0; i < 2; i++) {
        ruleIdsB.push(await createRuleViaApi(kbnClient, `scout-bulk-B-${runId}-${i}`, [tagB]));
      }
    });

    test.afterAll(async ({ kbnClient }) => {
      for (const id of [...ruleIdsA, ...ruleIdsB]) {
        await deleteRuleViaApi(kbnClient, id);
      }
    });

    test('bulk disable applies only to rules matching the list filter, not the full space', async ({
      browserAuth,
      page,
      pageObjects,
      kbnClient,
    }) => {
      await test.step('precondition: all seed rules are enabled', async () => {
        for (const id of [...ruleIdsA, ...ruleIdsB]) {
          expect(await getRuleEnabled(kbnClient, id)).toBe(true);
        }
      });

      await test.step('open rules list and filter by tag A', async () => {
        await browserAuth.loginAsAdmin();
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable()).toBeVisible();
        await pageObjects.rulesList.filterBySingleTag(tagA);
      });

      await test.step('filtered list shows tag A rules only', async () => {
        await expect(pageObjects.rulesList.rowCheckbox(ruleIdsA[0])).toBeVisible({
          timeout: 60_000,
        });
        await expect(pageObjects.rulesList.rowCheckbox(ruleIdsA[1])).toBeVisible();
        await expect(page.testSubj.locator(`checkboxSelectRow-${ruleIdsB[0]}`)).toHaveCount(0);
        await expect(page.testSubj.locator(`checkboxSelectRow-${ruleIdsB[1]}`)).toHaveCount(0);
      });

      await test.step('select all filtered rules and bulk disable', async () => {
        await pageObjects.rulesList.rowCheckbox(ruleIdsA[0]).click();
        await expect(pageObjects.rulesList.selectAllRulesButton()).toBeVisible();
        await pageObjects.rulesList.selectAllRulesButton().click();
        await expect(pageObjects.rulesList.selectAllRulesButton()).toBeHidden();
        await pageObjects.rulesList.bulkActionsButton().click();
        await pageObjects.rulesList.bulkDisableMenuItem().click();
      });

      await test.step('tag A rules are disabled; tag B rules stay enabled', async () => {
        await expect
          .poll(async () => getRuleEnabled(kbnClient, ruleIdsA[0]), { timeout: 60_000 })
          .toBe(false);
        await expect.poll(async () => getRuleEnabled(kbnClient, ruleIdsA[1])).toBe(false);
        await expect.poll(async () => getRuleEnabled(kbnClient, ruleIdsB[0])).toBe(true);
        await expect.poll(async () => getRuleEnabled(kbnClient, ruleIdsB[1])).toBe(true);
      });
    });
  }
);
