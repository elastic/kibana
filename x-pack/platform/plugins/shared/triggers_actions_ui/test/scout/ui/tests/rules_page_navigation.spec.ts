/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const RULES_LIST_SUBJ = 'rulesList';

test.describe('Rules page navigation and loading', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-page-navigation')
    );
    createdRuleId = response.data.id;
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterAll(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
    }
  });

  test('navigates to /app/rules successfully', async ({ page }) => {
    expect(page.url()).toContain('/app/rules');
  });

  test('loads with the correct page title', async ({ page }) => {
    await expect(page.testSubj.locator('appTitle')).toHaveText('Rules');
  });

  test('displays the rules list', async ({ page }) => {
    await expect(page.testSubj.locator(RULES_LIST_SUBJ)).toBeVisible();
  });
});
