/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Space-scoped Machine Learning UI smoke: ML enabled → overview renders;
// ML disabled → `/app/ml` returns a raw 404 JSON response.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CUSTOM_ROLES } from '../fixtures';

const ENABLED_SPACE_ID = 'ml_fc_enabled_space';
const DISABLED_SPACE_ID = 'ml_fc_disabled_space';

test.describe('Machine Learning feature controls', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.create({
      id: ENABLED_SPACE_ID,
      disabledFeatures: [],
    });
    await apiServices.spaces.create({
      id: DISABLED_SPACE_ID,
      disabledFeatures: ['ml'],
    });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(ENABLED_SPACE_ID);
    await apiServices.spaces.delete(DISABLED_SPACE_ID);
  });

  test('mlAppPageOverview renders in a space where ML is enabled', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_all);
    await page.goto(kbnUrl.app('ml/overview', { space: ENABLED_SPACE_ID }));

    await expect(page.testSubj.locator('mlAppPageOverview')).toBeVisible();
  });

  test('navigating to /app/ml returns 404 in a space where ML is disabled', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_all);

    // Server responds with a raw 404 JSON body (not the SPA "app not found").
    const response = await page.goto(kbnUrl.app('ml', { space: DISABLED_SPACE_ID }));

    expect(response?.status()).toBe(404);
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(JSON.parse(bodyText)).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });
});
