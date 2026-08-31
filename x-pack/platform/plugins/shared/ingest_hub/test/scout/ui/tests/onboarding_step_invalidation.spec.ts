/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Both services are in the "security_identity_compliance" category,
// visible without switching signal filter or category.
const NON_AGENTLESS_ID = 'guardduty';
const AGENTLESS_ID = 'inspector';

// Seeds session storage before the app navigates so react-use/useSessionStorage
// picks up the values on mount. Must be called after login but before gotoApp.
async function seedSessionStorage(
  page: ScoutPage,
  {
    selectedServiceIds,
    stepState,
  }: {
    selectedServiceIds: string[];
    stepState: Record<string, 'complete' | 'incomplete'>;
  }
) {
  await page.addInitScript(
    ({ ids, state }) => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ids })
      );
      sessionStorage.setItem('onboarding.aws.stepState', JSON.stringify(state));
    },
    { ids: selectedServiceIds, state: stepState }
  );
}

test.describe('Onboarding — downstream step invalidation', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices, config }) => {
    // The /internal/core/_settings route is only registered when
    // coreApp.allowDynamicConfigOverrides=true (Scout's local stateful base config).
    // ECH deployments don't carry that override, so the PUT 404s. Skip on Cloud.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      config.isCloud === true,
      `Core API returns 404 for 'ingestHub.onboardingEnabled' on ECH`
    );
    if (config.isCloud) {
      return;
    }
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'ingestHub.onboardingEnabled': 'true',
      },
    });
  });

  test.afterAll(async ({ apiServices, config }) => {
    if (config.isCloud) {
      return;
    }
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'ingestHub.onboardingEnabled': 'false',
      },
    });
  });

  // Path 1: service-settings was completed in a previous pass. Changing the service
  // selection must immediately mark it incomplete so the stepper indicator can no
  // longer be clicked past without re-entering configuration.
  test('path 1 — service-settings indicator loses checkmark when selection changes', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    // Seed before navigation so react-use picks up the values on first mount.
    await seedSessionStorage(page, {
      selectedServiceIds: [AGENTLESS_ID],
      stepState: {
        services: 'complete',
        'service-settings': 'complete',
        'authenticate-and-deploy': 'incomplete',
        'deploy-and-detect': 'incomplete',
      },
    });
    await page.gotoApp('onboarding/aws#services');

    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // Confirm service-settings starts as complete.
    await expect(page.testSubj.locator('onboardingStepIndicator-service-settings')).toHaveAttribute(
      'data-step-status',
      'complete'
    );

    // Toggle a non-agentless service — changes the selection signature.
    await page.testSubj.locator(`servicesStep-toggle-${NON_AGENTLESS_ID}`).click();

    // service-settings must immediately become incomplete.
    await expect(page.testSubj.locator('onboardingStepIndicator-service-settings')).toHaveAttribute(
      'data-step-status',
      'incomplete'
    );
  });
});
