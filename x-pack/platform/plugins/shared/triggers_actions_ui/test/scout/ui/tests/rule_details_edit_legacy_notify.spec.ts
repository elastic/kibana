/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Edit rule with legacy rule-level notify values" describe block.
// Verifies that a rule created with legacy rule-level `notify_when` / `throttle`
// surfaces those values as action-level frequency settings in the edit flyout,
// and can be saved successfully.
//
// FTR used test.always-firing; substituted with .index-threshold + a dynamically
// created .server-log connector (preconfigured 'my-server-log' is not guaranteed
// across environments).

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const createServerLogConnector = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string; name: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: { name, connector_type_id: '.server-log', config: {}, secrets: {} },
  });
  return resp.data;
};

const deleteConnector = async (kbnClient: KbnClient, connectorId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${connectorId}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

test.describe('Rule Details - Legacy notify values', { tag: tags.stateful.classic }, () => {
  const ruleName = `legacy-notify-${uuidv4()}`;
  const updatedRuleName = `Changed rule ${ruleName}`;
  let ruleId: string;
  let connectorId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const connector = await createServerLogConnector(kbnClient, `scout-log-${Date.now()}`);
    connectorId = connector.id;

    // Rule-level notify_when + throttle (legacy) with an action that has no
    // action-level frequency — the edit flyout should convert these to
    // action-level "On custom action intervals" with a 2 day throttle.
    const resp = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/alerting/rule',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        name: ruleName,
        rule_type_id: '.index-threshold',
        consumer: 'alerts',
        schedule: { interval: '1m' },
        notify_when: 'onThrottleInterval',
        throttle: '2d',
        actions: [
          {
            id: connectorId,
            group: 'threshold met',
            params: { level: 'info', message: 'from alert 1s' },
          },
        ],
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000],
          index: ['.kibana'],
          timeField: '@timestamp',
        },
      },
    });
    ruleId = resp.data.id;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await expect(pageObjects.ruleDetailsPage.ruleDetailsTitle).toBeVisible({ timeout: 20_000 });
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    if (ruleId) await apiServices.alerting.rules.delete(ruleId);
    if (connectorId) await deleteConnector(kbnClient, connectorId);
  });

  test('should convert rule-level params to action-level params and save the rule successfully', async ({
    page,
  }) => {
    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');

    // Legacy rule-level notify values are surfaced as action-level frequency.
    await expect(page.testSubj.locator('notifyWhenSelect')).toContainText(
      'On custom action intervals'
    );
    await expect(page.testSubj.locator('throttleInput')).toHaveValue('2');
    await expect(page.testSubj.locator('throttleUnitInput')).toHaveValue('d');

    await page.testSubj.locator('ruleDetailsNameInput').fill(updatedRuleName);
    await page.locator('[data-test-subj="rulePageFooterSaveButton"]:not([disabled])').click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Updated "${updatedRuleName}"`
    );
  });
});
