/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

/*
 * Tags editing through the shared rule form (compose_discover flyout, Details
 * step). The `TagsField` and this edit flow are shared by both the rule builder
 * and the ES|QL form; this suite exercises the ES|QL path (a composed rule with
 * no `builder_type`, which opens the edit flyout in ES|QL mode).
 *
 * Regression: removing every tag used to report success but silently preserve
 * the old tags, because an empty tags array was dropped from the update payload
 * instead of clearing them.
 */
const TEST_INDEX = 'test-rule-tags-edit';

test.describe('Rule tags — edit via ES|QL form', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esClient, apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await esClient.indices.create(
      {
        index: TEST_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
          },
        },
      },
      { ignore: [400] }
    );
    await esClient.index({
      index: TEST_INDEX,
      document: { '@timestamp': new Date().toISOString(), 'host.name': 'host-1' },
      refresh: 'wait_for',
    });
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAlertingV2Editor();
    await pageObjects.rulesList.goto();
    await expect(page.testSubj.locator('rulesListLoading')).toBeHidden({ timeout: 60_000 });
  });

  test.afterAll(async ({ esClient, apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
  });

  test('removing all tags persists (does not restore the old tags)', async ({
    pageObjects,
    apiServices,
  }) => {
    let ruleId: string;

    await test.step('seed an ES|QL rule with tags via API', async () => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          // No `builder_type`, so the edit flyout opens in ES|QL mode.
          metadata: { name: 'scout-esql-clear-tags', tags: ['prod', 'infra'] },
          query: {
            format: 'composed',
            base: `FROM ${TEST_INDEX} | STATS count = COUNT(*)`,
            breach: { segment: '| WHERE count > 5' },
          },
          time_field: '@timestamp',
          recovery_strategy: undefined,
        })
      );
      ruleId = rule.id;
      expect(rule.metadata.tags).toStrictEqual(['prod', 'infra']);
    });

    await test.step('refresh rules list', async () => {
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
    });

    await test.step('open the edit flyout in ES|QL mode', async () => {
      await pageObjects.composeDiscover.openEditFlyout(ruleId!);
      await expect(pageObjects.composeDiscover.flyout).toBeVisible({ timeout: 30_000 });
      // A rule without builder_type opens directly in ES|QL mode (no builder switch).
      await expect(pageObjects.composeDiscover.switchToEsqlToggle).toBeHidden();
    });

    await test.step('navigate to the Details step and remove all tags', async () => {
      await pageObjects.composeDiscover.clickNext();
      await pageObjects.composeDiscover.clickNext();
      await expect(pageObjects.composeDiscover.ruleNameInput).toBeVisible();
      await pageObjects.composeDiscover.clearAllTags();
    });

    await test.step('advance to the Actions step and submit', async () => {
      await pageObjects.composeDiscover.clickNext();
      await expect(pageObjects.composeDiscover.submitButton).toBeVisible();
      await pageObjects.composeDiscover.clickSubmit();
      await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
    });

    await test.step('the rule has no tags after saving', async () => {
      await expect
        .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).metadata.tags, {
          timeout: 30_000,
        })
        .toBeUndefined();
    });
  });
});
