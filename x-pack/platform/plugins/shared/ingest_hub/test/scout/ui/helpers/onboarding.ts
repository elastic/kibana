/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserAuthFixture, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ServiceVars } from '../../../../public/onboarding/step_components/service_settings_step/use_service_settings';
import { test } from '../fixtures';

export const SERVICES_STEP_SESSION_KEY = 'onboarding.aws.servicesStep';
export const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

// Derives the root test-subj for a step from its id, matching the convention used in each step's
// root <div data-test-subj={`onboardingStep-${id}`}>.
const stepSubj = (step: string) => `onboardingStep-${step}`;

export async function mockAwsPackage(page: ScoutPage, response: unknown): Promise<void> {
  await page.route(
    (url) => /\/api\/fleet\/epm\/packages\/aws$/.test(url.pathname),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
  );
}

export async function navigateToOnboardingStep(
  browserAuth: BrowserAuthFixture,
  page: ScoutPage,
  step: 'services' | 'service-settings' | 'authenticate-and-deploy' | 'detect-and-review',
  opts: {
    selectedServiceIds: string[];
    globalRegion?: string;
    serviceVars?: Record<string, ServiceVars>;
    instances?: unknown[];
  }
): Promise<void> {
  const { selectedServiceIds, globalRegion = 'us-east-1', serviceVars = {}, instances } = opts;
  await browserAuth.loginAsAdmin();
  await page.gotoApp(`onboarding/aws#${step}`);
  await page.evaluate(
    ({
      ids,
      region,
      vars,
      insts,
      servicesKey,
      settingsKey,
    }: {
      ids: string[];
      region: string;
      vars: Record<string, ServiceVars>;
      insts: unknown[] | undefined;
      servicesKey: string;
      settingsKey: string;
    }) => {
      sessionStorage.setItem(servicesKey, JSON.stringify({ selectedServiceIds: ids }));
      const settingsPayload: Record<string, unknown> = { globalRegion: region, serviceVars: vars };
      if (insts !== undefined) settingsPayload.instances = insts;
      sessionStorage.setItem(settingsKey, JSON.stringify(settingsPayload));
    },
    {
      ids: selectedServiceIds,
      region: globalRegion,
      vars: serviceVars,
      insts: instances,
      servicesKey: SERVICES_STEP_SESSION_KEY,
      settingsKey: SERVICE_SETTINGS_SESSION_KEY,
    }
  );
  await page.reload();
  await expect(page.testSubj.locator(stepSubj(step))).toBeVisible();
}

export function useOnboardingFeatureFlag(): void {
  // eslint-disable-next-line playwright/require-top-level-describe
  test.beforeAll(async ({ apiServices, config }) => {
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

  // eslint-disable-next-line playwright/require-top-level-describe
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
}
