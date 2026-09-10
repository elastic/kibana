/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const SM_BASE = 'management/insightsAndAlerting/triggersActions';
const RULES_LIST_URL_RE = new RegExp(`/app/${SM_BASE}/?(?:\\?|#|$)`);

test.describe('Rule details back button', { tag: tags.stateful.classic }, () => {
  let testRuleId: string;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(makeEsQueryRule('scout-back-button'));
    testRuleId = response.data.id;
  });

  test.afterAll(async ({ apiServices }) => {
    if (testRuleId) {
      await apiServices.alerting.rules.delete(testRuleId);
    }
  });

  test('navigates back to the rules list when clicking the back button', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(`/app/${SM_BASE}/rule/${testRuleId}`));

    await expect(page.testSubj.locator('appHeaderTitle')).toBeVisible({ timeout: 20_000 });

    await test.step('rule details page URL is under Stack Management', async () => {
      expect(page.url()).toContain(`/app/${SM_BASE}/rule/${testRuleId}`);
    });

    await test.step('clicks the back link and returns to rules list', async () => {
      await page.testSubj.click('appHeaderBack');

      await expect(page).toHaveURL(RULES_LIST_URL_RE);
      expect(page.url()).toContain(`/app/${SM_BASE}`);
      expect(page.url()).not.toContain('/rule/');
      await expect(page.testSubj.locator('rulesList')).toBeVisible();
    });
  });
});
