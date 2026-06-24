/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/redirect.ts
//
// 2 of 2 tests migrated.
// The /app/rules app is a thin redirect shim: both tests verify the redirect
// works (the destination page rendering is tested elsewhere).

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

test.describe('Redirect from /app/rules', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.allSettled(createdRuleIds.map((id) => apiServices.alerting.rules.delete(id)));
    createdRuleIds.length = 0;
  });

  test('redirects /app/rules to the Stack Management rules page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/rules'));
    await page.waitForURL(/app\/management\/insightsAndAlerting\/triggersActions/, {
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/app\/management\/insightsAndAlerting\/triggersActions/);
  });

  test('preserves the sub-path when redirecting /app/rules/:path to Stack Management', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const { data: rule } = await apiServices.alerting.rules.create(makeEsQueryRule('redirect'));
    createdRuleIds.push(rule.id);

    await page.goto(kbnUrl.get(`/app/rules/rule/${rule.id}`));
    await page.waitForURL(
      new RegExp(`app/management/insightsAndAlerting/triggersActions/rule/${rule.id}`),
      { timeout: 15_000 }
    );
    await expect(page).toHaveURL(
      new RegExp(`app/management/insightsAndAlerting/triggersActions/rule/${rule.id}`)
    );
  });
});
