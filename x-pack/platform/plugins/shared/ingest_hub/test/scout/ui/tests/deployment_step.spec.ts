/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe(
  'Deployment step — renders deployment stack sections',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'ingestHub.onboardingEnabled': 'true',
        },
      });
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'ingestHub.onboardingEnabled': false,
        },
      });
    });

    test('navigates to the deployment step and renders the step container', async ({
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('onboarding/aws#deployment');

      await expect(page.testSubj.locator('onboardingStep-deployment')).toBeVisible();
    });

    test('shows deployment step content when navigated via hash', async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('onboarding/aws#deployment');

      const stepContainer = page.testSubj.locator('onboardingStep-deployment');
      await expect(stepContainer).toBeVisible();
    });

    test('shows continue button on the deployment step', async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('onboarding/aws#deployment');

      const continueButton = page.testSubj.locator('deploymentContinueButton');
      await expect(continueButton).toBeVisible();
      await expect(continueButton).toBeDisabled();
    });
  }
);
