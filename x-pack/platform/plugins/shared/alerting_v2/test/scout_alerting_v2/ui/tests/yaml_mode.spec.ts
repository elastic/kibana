/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

const TEST_INDEX = 'test-yaml-mode';
const RULE_NAME = 'scout-yaml-mode-view';
const EDITED_RULE_NAME = 'scout-yaml-mode-edited';

test.describe('YAML mode — view and edit rules', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esClient, apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await esClient.indices.create(
      {
        index: TEST_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
          },
        },
      },
      { ignore: [400] }
    );
    await esClient.index({
      index: TEST_INDEX,
      document: { '@timestamp': new Date().toISOString(), message: 'hello' },
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

  test('view API-created rule in YAML mode — correct shape', async ({
    pageObjects,
    apiServices,
  }) => {
    let ruleId: string;

    await test.step('seed a rule via API (no description, no owner — optional fields absent)', async () => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: RULE_NAME, tags: ['yaml-test'] },
          query: {
            format: 'standalone',
            breach: { query: `FROM ${TEST_INDEX} | STATS count = COUNT(*)` },
          },
          grouping: { fields: ['message'] },
          state_transition: { pending_count: 3, pending_timeframe: '10m' },
        })
      );
      ruleId = rule.id;
    });

    await test.step('refresh rules list and open edit flyout', async () => {
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      await pageObjects.composeDiscover.openEditFlyout(ruleId!);
      await expect(pageObjects.composeDiscover.flyout).toBeVisible();
    });

    await test.step('switch to YAML mode', async () => {
      await pageObjects.composeDiscover.switchToYamlMode();
    });

    await test.step('YAML has the expected structure with all seeded fields', async () => {
      const yamlString = await pageObjects.composeDiscover.getYamlEditorValue();
      const parsed = load(yamlString) as Record<string, unknown>;

      expect(parsed).toMatchObject({
        kind: 'alert',
        metadata: {
          name: RULE_NAME,
          tags: ['yaml-test'],
        },
        time_field: '@timestamp',
        schedule: {
          every: expect.any(String),
          lookback: expect.any(String),
        },
        query: {
          format: 'standalone',
          breach: { query: expect.stringContaining(TEST_INDEX) },
        },
        grouping: { fields: ['message'] },
        state_transition: {
          pending_count: 3,
          pending_timeframe: '10m',
        },
      });
    });
  });

  test('edit rule name in YAML mode and save', async ({ page, pageObjects, apiServices }) => {
    let ruleId: string;

    await test.step('seed a rule via API', async () => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: RULE_NAME },
          query: {
            format: 'standalone',
            breach: { query: `FROM ${TEST_INDEX} | LIMIT 10` },
          },
          grouping: { fields: ['message'] },
          state_transition: { pending_count: 1 },
        })
      );
      ruleId = rule.id;
    });

    await test.step('open edit flyout and switch to YAML mode', async () => {
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      await pageObjects.composeDiscover.openEditFlyout(ruleId!);
      await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      await pageObjects.composeDiscover.switchToYamlMode();
    });

    await test.step('edit the rule name in the YAML editor', async () => {
      const yaml = await pageObjects.composeDiscover.getYamlEditorValue();
      await pageObjects.composeDiscover.setYamlEditorValue(
        yaml.replace(RULE_NAME, EDITED_RULE_NAME)
      );
    });

    await test.step('save via YAML mode submit', async () => {
      const yamlSubmit = page.testSubj.locator('composeDiscoverYamlSubmit');
      await expect(yamlSubmit).toBeEnabled({ timeout: 30_000 });
      await yamlSubmit.click();
      await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
    });

    await test.step('verify rule name updated via API', async () => {
      await expect
        .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).metadata.name, {
          timeout: 30_000,
        })
        .toBe(EDITED_RULE_NAME);
    });
  });
});
