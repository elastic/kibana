/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Saved Objects Management Navigation" describe block.
// Creates rules in both the default and a non-default space, then verifies
// that clicking the rule entry in Saved Objects Management navigates to the
// correct rule details page.

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const createSpace = async (kbnClient: KbnClient, spaceId: string, spaceName: string) => {
  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    headers: { 'kbn-xsrf': 'scout' },
    body: { id: spaceId, name: spaceName, description: 'Scout test space' },
  });
};

const deleteSpace = async (kbnClient: KbnClient, spaceId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/spaces/space/${spaceId}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

const createRuleInSpace = async (kbnClient: KbnClient, spaceId: string, ruleName: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}/api/alerting/rule`,
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name: ruleName,
      rule_type_id: '.es-query',
      consumer: 'stackAlerts',
      schedule: { interval: '1m' },
      actions: [],
      params: makeEsQueryRule(ruleName).params,
    },
  });
  return resp.data;
};

const deleteRuleInSpace = async (kbnClient: KbnClient, spaceId: string, ruleId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/s/${spaceId}/api/alerting/rule/${ruleId}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

test.describe(
  'Rule Details - Saved Objects Management Navigation',
  { tag: tags.stateful.classic },
  () => {
    const testRunUuid = uuidv4();
    const spaceId = `scout-so-nav-${testRunUuid.slice(0, 8)}`;
    const testRuleName = `so-nav-rule-${testRunUuid}`;
    const testSpaceRuleName = `so-nav-rule-space-${testRunUuid}`;
    let defaultRuleId: string;
    let spaceRuleId: string;

    test.beforeAll(async ({ apiServices, kbnClient }) => {
      const r = await apiServices.alerting.rules.create({
        ...makeEsQueryRule(testRuleName),
        name: testRuleName,
      });
      defaultRuleId = r.data.id;

      await createSpace(kbnClient, spaceId, `Scout SO Nav Space ${testRunUuid}`);

      const spaceRule = await createRuleInSpace(kbnClient, spaceId, testSpaceRuleName);
      spaceRuleId = spaceRule.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      if (defaultRuleId) await apiServices.alerting.rules.delete(defaultRuleId);
      if (spaceRuleId) await deleteRuleInSpace(kbnClient, spaceId, spaceRuleId);
      await deleteSpace(kbnClient, spaceId);
    });

    test('should navigate to rule details from saved objects management page in default space', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(kbnUrl.get('/app/management/kibana/objects'));
      await page.locator('.euiBasicTable:not(.euiBasicTable-loading)').waitFor();

      await page.getByText(`Rule: [${testRuleName}]`).click();

      await expect(page.testSubj.locator('ruleDetailsTitle')).toContainText(testRuleName, {
        timeout: 15_000,
      });
      await expect(page.testSubj.locator('statusDropdown')).toBeVisible();

      await page.testSubj.click('ruleActionsButton');
      await expect(page.testSubj.locator('openEditRuleFlyoutButton')).toBeVisible();
    });

    test('should navigate to rule details from saved objects management page in non-default space', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(kbnUrl.get(`/s/${spaceId}/app/management/kibana/objects`));
      await page.locator('.euiBasicTable:not(.euiBasicTable-loading)').waitFor();

      await page.getByText(`Rule: [${testSpaceRuleName}]`).click();

      await expect(page.testSubj.locator('ruleDetailsTitle')).toContainText(testSpaceRuleName, {
        timeout: 15_000,
      });
      await expect(page.testSubj.locator('statusDropdown')).toBeVisible();

      await page.testSubj.click('ruleActionsButton');
      await expect(page.testSubj.locator('openEditRuleFlyoutButton')).toBeVisible();

      expect(page.url()).toContain(`/s/${spaceId}/`);
    });
  }
);
