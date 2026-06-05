/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Edit rule button" describe block.
// Uses .index-threshold with a dynamically created .server-log connector
// (FTR used preconfigured 'my-server-log' which is unavailable in Scout).
// Tests are stateful: test 1 renames the rule; test 2 reads the new name.

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

test.describe('Rule Details - Edit rule button', { tag: tags.stateful.classic }, () => {
  const ruleName = `edit-rule-${uuidv4()}`;
  const updatedRuleName = `Changed Rule Name ${ruleName}`;
  let ruleId: string;
  let connectorId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const connector = await createServerLogConnector(kbnClient, `scout-log-${Date.now()}`);
    connectorId = connector.id;

    const resp = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/alerting/rule',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        name: ruleName,
        rule_type_id: '.index-threshold',
        consumer: 'alerts',
        schedule: { interval: '1m' },
        actions: [
          {
            id: connectorId,
            group: 'threshold met',
            params: { level: 'info', message: '{{context.message}}' },
            frequency: { summary: false, notify_when: 'onThrottleInterval', throttle: '1m' },
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

  test('should open edit rule flyout', async ({ page }) => {
    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');

    await expect(page.testSubj.locator('hasActionsDisabled')).toBeHidden();

    await page.testSubj.locator('ruleDetailsNameInput').fill(updatedRuleName);
    await page.locator('[data-test-subj="rulePageFooterSaveButton"]:not([disabled])').click();

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Updated "${updatedRuleName}"`
    );
    await expect(page.testSubj.locator('ruleDetailsTitle')).toContainText(updatedRuleName, {
      timeout: 30_000,
    });
  });

  test('should reset rule when canceling an edit', async ({ page }) => {
    // Rule name is now updatedRuleName from the previous test
    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');

    const nameInput = page.testSubj.locator('ruleDetailsNameInput');
    await nameInput.click();
    await nameInput.pressSequentially(uuidv4().slice(0, 8));
    await page.testSubj.click('rulePageFooterCancelButton');

    await expect(page.testSubj.locator('confirmRuleCloseModal')).toBeVisible();
    await page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]')
      .click();

    await expect(page.testSubj.locator('rulePageFooterCancelButton')).toBeHidden();

    // Open edit again — name should still be updatedRuleName
    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');
    await expect(page.testSubj.locator('ruleDetailsNameInput')).toHaveValue(updatedRuleName);
  });
});
