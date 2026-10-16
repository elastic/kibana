/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

/*
 * Routing tags editing through the shared rule form (compose_discover flyout,
 * Actions step), on the ES|QL path: a composed rule with no `builder` metadata.
 */
const TEST_INDEX = `test-rule-routing-tags-edit-${Date.now()}`;

test.describe(
  'Rule routing tags — edit via ES|QL form',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const createdRuleIds: string[] = [];

    test.beforeAll(async ({ esClient }) => {
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
      for (const id of createdRuleIds) {
        await apiServices.alertingV2.rules.delete(id);
      }
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
    });

    test('replacing routing tags on the Actions step persists them and leaves tags alone', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed an ES|QL rule with tags and routing tags via API', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: {
              name: 'scout-esql-routing-tags',
              tags: ['prod'],
              routing_tags: ['old-route'],
            },
            query: {
              base: `FROM ${TEST_INDEX} | STATS count = COUNT(*)`,
              breach: { segment: '| WHERE count > 5' },
            },
            time_field: '@timestamp',
          })
        );
        ruleId = rule.id;
        createdRuleIds.push(ruleId);
      });

      await test.step('refresh rules list', async () => {
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('open the edit flyout and go to the Actions step', async () => {
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible({ timeout: 30_000 });
        await pageObjects.composeDiscover.clickNext();
        await pageObjects.composeDiscover.clickNext();
        await pageObjects.composeDiscover.clickNext();
        await expect(pageObjects.composeDiscover.routingTagsInput).toBeVisible();
        await expect(pageObjects.composeDiscover.routingTagsInput).toContainText('old-route');
      });

      await test.step('replace the routing tags', async () => {
        await pageObjects.composeDiscover.clearAllRoutingTags();
        await pageObjects.composeDiscover.addRoutingTag('sre');
        await pageObjects.composeDiscover.addRoutingTag('payments');
        await expect(pageObjects.composeDiscover.routingTagsInput).toContainText('sre');
        await expect(pageObjects.composeDiscover.routingTagsInput).toContainText('payments');
      });

      await test.step('submit', async () => {
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      await test.step('the rule has the new routing tags and its tags are unchanged', async () => {
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).metadata, {
            timeout: 30_000,
          })
          .toMatchObject({ tags: ['prod'], routing_tags: ['sre', 'payments'] });
      });
    });
  }
);
