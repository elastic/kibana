/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const API_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': testData.OSQUERY_API_VERSION,
};

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe(
  'Osquery response actions form persistence',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;
    let packId: string;
    let packName: string;

    test.beforeAll(async ({ kbnClient, apiServices }) => {
      packName = `persist-test-pack-${uniqueId()}`;
      const packResponse = await apiServices.osquery.packs.create({
        name: packName,
        description: 'Pack for persistence UI test',
        enabled: true,
        queries: {
          uptimeQuery: { query: 'select * from uptime;', interval: 3600 },
        },
        shards: {},
      });
      packId = (packResponse.data as Record<string, Record<string, string>>).data.saved_object_id;

      const ruleResponse = await kbnClient.request({
        method: 'POST',
        path: '/api/detection_engine/rules',
        body: {
          type: 'query',
          index: ['auditbeat-*'],
          language: 'kuery',
          query: '_id:*',
          name: `Persistence test rule ${uniqueId()}`,
          description: 'Rule for form persistence tests',
          risk_score: 21,
          severity: 'low',
          interval: '5m',
          from: 'now-360s',
          to: 'now',
          enabled: false,
        },
        headers: API_HEADERS,
      });
      ruleId = (ruleResponse.data as Record<string, string>).id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      if (ruleId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/detection_engine/rules?id=${ruleId}`,
          headers: API_HEADERS,
          ignoreErrors: [404],
        });
      }

      if (packId) {
        await apiServices.osquery.packs.delete(packId);
      }
    });

    test('persists response actions after save and supports action management', async ({
      pageObjects,
      page,
    }) => {
      const { responseActionsForm } = pageObjects;

      await test.step('navigate and add query action', async () => {
        await responseActionsForm.gotoRuleEdit(ruleId);
        await responseActionsForm.clickActionsTab();
        await responseActionsForm.addOsqueryAction(0);
        await responseActionsForm.fillQuery('select * from uptime1', 0);
      });

      await test.step('add pack-based action', async () => {
        await responseActionsForm.addOsqueryAction(1);
        await responseActionsForm.switchToPackMode(1);
        await responseActionsForm.selectPack(packName, 1);
        await expect(responseActionsForm.errorsContainer).toBeHidden();
      });

      await test.step('add action with ECS mapping', async () => {
        await responseActionsForm.addOsqueryAction(2);
        await responseActionsForm.fillQuery('select * from uptime', 2);
        await responseActionsForm.expandAdvanced(2);
        await responseActionsForm.addEcsMapping('label', 'days', 2);
      });

      await test.step('submit and verify success', async () => {
        await responseActionsForm.submitRule();
        await expect(page.getByText('was saved')).toBeVisible({ timeout: 15000 });
      });

      await test.step('verify persistence after re-opening edit form', async () => {
        await responseActionsForm.editRuleLink.click();
        await responseActionsForm.actionsTab.waitFor({ state: 'visible', timeout: 30000 });
        await responseActionsForm.clickActionsTab();

        const item0 = responseActionsForm.getResponseActionItem(0);
        const item1 = responseActionsForm.getResponseActionItem(1);
        const item2 = responseActionsForm.getResponseActionItem(2);

        await expect(item0).toContainText('select * from uptime1', { timeout: 15000 });
        await expect(item2).toContainText('select * from uptime', { timeout: 15000 });
        await expect(item2).toContainText('Days of uptime', { timeout: 15000 });
        await expect(item1).toContainText('Run a set of queries in a pack');
      });

      await test.step('remove first action and verify remaining actions shift', async () => {
        await responseActionsForm.removeAction(0);
        const shiftedItem0 = responseActionsForm.getResponseActionItem(0);
        await expect(shiftedItem0).toContainText('Run a set of queries in a pack', {
          timeout: 10000,
        });

        const shiftedItem1 = responseActionsForm.getResponseActionItem(1);
        await expect(shiftedItem1).toContainText('select * from uptime', { timeout: 10000 });
      });

      await test.step('submit after removal and verify save', async () => {
        await responseActionsForm.submitRule();
        await expect(page.getByText('was saved')).toBeVisible({ timeout: 15000 });
      });
    });
  }
);
