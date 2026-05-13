/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Onboarding app — FF disabled (default)', { tag: tags.stateful.classic }, () => {
  test('redirects away when onboarding feature flag is disabled', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding');

    await expect(page.testSubj.locator('onboardingApp')).toBeHidden();
    expect(page.url()).not.toContain('/app/onboarding');
  });
});
