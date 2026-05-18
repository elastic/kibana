/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Onboarding app — FF enabled', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.goto('/app/onboarding/aws');
  });

  test('redirects to first step hash when no hash is present', async ({ page }) => {
    await expect(page).toHaveURL(/#connect/);
  });

  test('renders the onboarding step shell', async ({ page }) => {
    await expect(page.testSubj.locator('onboardingShell')).toBeVisible();
  });

  test('shows the connect step as current', async ({ page }) => {
    await expect(page.testSubj.locator('onboardingStep-connect')).toBeVisible();
  });

  test('renders 5 step indicators', async ({ page }) => {
    const steps = page.testSubj.locator('onboardingShell').locator('.euiStep');
    await expect(steps).toHaveCount(5);
  });

  test('navigates directly to a step via hash', async ({ page }) => {
    await page.goto('/app/onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();
  });
});
