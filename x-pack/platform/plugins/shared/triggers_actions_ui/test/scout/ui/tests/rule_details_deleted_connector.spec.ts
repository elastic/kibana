/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Edit rule with deleted connector" describe block.
//
// Verifies that when a connector referenced by a rule is deleted, the rule's
// edit flyout surfaces an "Unable to find connector" action and lets the user
// add a replacement connector of the same type.
//
// FTR used preconfigured 'my-slack1' (Slack#xyztest) as the replacement; here we
// create a second Slack connector dynamically so the same-type replacement
// behavior is covered without depending on preconfigured connectors.

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const createSlackConnector = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      connector_type_id: '.slack',
      config: {},
      secrets: {
        webhookUrl: 'https://example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      },
    },
  });
  return resp.data;
};

const deleteConnector = async (kbnClient: KbnClient, connectorId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${connectorId}`,
    headers: { 'kbn-xsrf': 'scout' },
    ignoreErrors: [404],
  });
};

test.describe(
  'Rule Details - Edit rule with deleted connector',
  { tag: tags.stateful.classic },
  () => {
    const ruleName = `deleted-connector-${uuidv4()}`;
    let ruleId: string;
    let deletedSlackConnectorId: string;
    let replacementSlackConnectorId: string;
    let replacementSlackConnectorName: string;

    test.beforeAll(async ({ kbnClient }) => {
      const connector = await createSlackConnector(kbnClient, `scout-slack-del-${Date.now()}`);
      deletedSlackConnectorId = connector.id;

      const replacementConnector = await createSlackConnector(
        kbnClient,
        `scout-slack-replace-${Date.now()}`
      );
      replacementSlackConnectorId = replacementConnector.id;
      replacementSlackConnectorName = replacementConnector.name;

      const resp = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/alerting/rule',
        headers: { 'kbn-xsrf': 'scout' },
        body: {
          name: ruleName,
          rule_type_id: '.es-query',
          consumer: 'stackAlerts',
          schedule: { interval: '1m' },
          actions: [
            {
              id: deletedSlackConnectorId,
              group: 'query matched',
              params: { message: 'from alert' },
              frequency: { summary: false, notify_when: 'onActionGroupChange', throttle: null },
            },
          ],
          params: {
            searchType: 'esQuery',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            esQuery: '{"query":{"match_all":{}}}',
            aggType: 'count',
            groupBy: 'all',
            termSize: 5,
            excludeHitsFromPreviousRun: false,
            sourceFields: [],
            index: ['.kibana'],
            timeField: 'updated_at',
          },
        },
      });
      ruleId = resp.data.id;

      // Delete the connector while it is still referenced by the rule so the rule
      // now points at a missing connector.
      await deleteConnector(kbnClient, deletedSlackConnectorId);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await expect(pageObjects.ruleDetailsPage.ruleDetailsTitle).toBeVisible({ timeout: 20_000 });
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      if (ruleId) await apiServices.alerting.rules.delete(ruleId);
      if (replacementSlackConnectorId) {
        await deleteConnector(kbnClient, replacementSlackConnectorId);
      }
    });

    test('should show and update deleted connectors when there are existing connectors of the same type', async ({
      page,
    }) => {
      await page.testSubj.click('ruleActionsButton');
      await page.testSubj.click('openEditRuleFlyoutButton');

      await expect(page.testSubj.locator('hasActionsDisabled')).toBeHidden();

      // The action whose connector was deleted renders an "Unable to find connector" header.
      await expect(page.locator('[data-test-subj="ruleActionsItem"] h2')).toContainText(
        'Unable to find connector'
      );

      // Add a replacement connector of the same kind via the connectors modal.
      await page.testSubj.click('ruleActionsAddActionButton');
      await expect(page.testSubj.locator('ruleActionsConnectorsModal')).toBeVisible();
      await page
        .locator('[data-test-subj="ruleActionsConnectorsModalCard"]')
        .filter({ hasText: replacementSlackConnectorName })
        .locator('button')
        .click();

      const ruleActionItems = page.testSubj.locator('ruleActionsItem');
      await expect(ruleActionItems).toHaveCount(2);
      // The deleted connector action is still shown.
      await expect(ruleActionItems.filter({ hasText: 'Unable to find connector' })).toBeVisible();
      // The replacement Slack connector was added successfully.
      await expect(
        ruleActionItems.filter({ hasText: replacementSlackConnectorName })
      ).toBeVisible();
    });
  }
);
