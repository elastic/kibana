/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { TRIAL_TRIGGER_DEF_ID } from '../fixtures/constants';

// Matches the server default (xpack.product_intercept.trialInterceptInterval: '7d')
const CONFIGURED_TRIAL_INTERCEPT_INTERVAL = 7 * 24 * 60 * 60 * 1000;

test.describe('Trial Product Intercept', { tag: tags.stateful.classic }, () => {
  let trialTriggerDefId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const kibanaVersion = await kbnClient.version.get();
    trialTriggerDefId = `${TRIAL_TRIGGER_DEF_ID}:${kibanaVersion}`;
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects, kbnUrl }) => {
    await browserAuth.loginAsAdmin();

    // Reset the user's interaction record so the trial intercept re-appears on every
    // test run. The non-recurrent gate in the prompter (prompter.ts:127) blocks display
    // permanently once lastInteractedInterceptId is truthy; setting it to 0 (falsy)
    // bypasses that check without needing direct access to the hidden SO type.
    const resetStatus = await page.request.post(
      kbnUrl.get(
        `/internal/api/intercepts/user_interaction/${encodeURIComponent(trialTriggerDefId)}`
      ),
      {
        data: { lastInteractedInterceptId: 0 },
        headers: { 'kbn-xsrf': 'xxx', 'x-elastic-internal-origin': 'Kibana' },
      }
    );
    expect(resetStatus.status()).toBe(201);
    await pageObjects.home.goto();

    // Backdate the intercept timer in localStorage so the prompter fires on reload,
    // without needing a short trialInterceptInterval server arg.
    await pageObjects.trialIntercept.triggerInterceptTimer(
      trialTriggerDefId,
      CONFIGURED_TRIAL_INTERCEPT_INTERVAL
    );
    await page.reload();
  });

  test('trial intercept can be dismissed and does not reappear', async ({ page, pageObjects }) => {
    const { trialIntercept } = pageObjects;

    await test.step('intercept is displayed after timer elapses', async () => {
      await expect(trialIntercept.intercept).toBeVisible();
    });

    await test.step('intercept is dismissed when "Not now" is clicked', async () => {
      await trialIntercept.dismissButton.click();
      await expect(trialIntercept.intercept).toBeHidden();
    });

    await test.step('intercept does not reappear on next page load', async () => {
      await page.reload();
      await expect(trialIntercept.intercept).toBeHidden();
    });
  });
});
