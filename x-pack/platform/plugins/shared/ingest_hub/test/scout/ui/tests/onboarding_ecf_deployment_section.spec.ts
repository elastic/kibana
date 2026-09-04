/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  ECF_LAUNCH_STEP_SESSION_KEY,
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// `cloudtrail` is an ECF-unified service: ecfLogType='cloudtrail', no ecfDedicatedTemplate.
// Selecting it produces a unified-family ECF section with one launch button.
// We omit serviceVars intentionally — `ecfInstances` falls back to one base instance per
// selected service, which is enough for `getEcfServiceConfigs` to build a config entry.
//
// The ECF version API is intercepted throughout so tests never make a real S3 request.
// It returns version '1.10.0' (the current fallback constant) so assertions are stable.

const ECF_SERVICE_ID = 'cloudtrail';
const ECF_UNIFIED_DEFAULT_STACK_NAME = 'edot-cloud-forwarder';
const MOCK_ECF_VERSION = '1.10.0';

const MOCK_VERSION_RESPONSE = JSON.stringify({ version: MOCK_ECF_VERSION, source: 'remote' });

test.describe('Onboarding ECF Deployment Section', { tag: tags.stateful.classic }, () => {
  useOnboardingFeatureFlag();

  test.beforeEach(async ({ page }) => {
    // Intercept the server-side ECF version proxy so tests don't make real outbound requests.
    await page.route(
      (url) => /\/internal\/onboarding\/ecf\/latest_version$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: MOCK_VERSION_RESPONSE,
        })
    );
  });

  test('pre-launch: ECF section is visible with launch button; no stack name field', async ({
    browserAuth,
    page,
  }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: [ECF_SERVICE_ID],
    });

    // The ECF accordion section should be visible.
    await expect(page.testSubj.locator('ecfDeploymentSection')).toBeVisible();

    // The unified launch button should be visible in pre-launch state.
    await expect(page.testSubj.locator('ecfDeploymentSection-unifiedLaunchButton')).toBeVisible();

    // Stack name field is hidden before the button is clicked.
    await expect(
      page.testSubj.locator('ecfDeploymentSection-unifiedLaunchButton-stackNameField')
    ).toBeHidden();
  });

  test('post-launch: accordion stays expanded with Done badge; stack name field is pre-filled', async ({
    browserAuth,
    page,
  }) => {
    // Seed the post-launch state directly into session storage — avoids relying on the AWS
    // Console popup (which opens in a new tab and can't be controlled by Playwright here).
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: [ECF_SERVICE_ID],
      ecfLaunchStep: {
        launchedFamilies: ['unified'],
        stackVersions: { unified: MOCK_ECF_VERSION },
      },
    });

    // Done badge should be visible — accordion must NOT have auto-collapsed.
    const headerButton = page.testSubj.locator('ecfDeploymentSection-headerButton');
    await expect(headerButton).toBeVisible();
    await expect(headerButton.getByText('Done')).toBeVisible();

    // The stack name field appears post-launch, pre-filled with the family default.
    const stackNameField = page.testSubj.locator(
      'ecfDeploymentSection-unifiedLaunchButton-stackNameField'
    );
    await expect(stackNameField).toBeVisible();
    await expect(stackNameField).toHaveValue(ECF_UNIFIED_DEFAULT_STACK_NAME);
  });

  test('post-launch: ECF version is displayed', async ({ browserAuth, page }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: [ECF_SERVICE_ID],
      ecfLaunchStep: {
        launchedFamilies: ['unified'],
        stackVersions: { unified: MOCK_ECF_VERSION },
      },
    });

    // The version label appears below the stack name field.
    await expect(
      page.testSubj.locator('ecfDeploymentSection-unifiedLaunchButton-version')
    ).toBeVisible();
  });

  test('post-launch: editing the stack name is written to session storage', async ({
    browserAuth,
    page,
  }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: [ECF_SERVICE_ID],
      ecfLaunchStep: {
        launchedFamilies: ['unified'],
        stackVersions: { unified: MOCK_ECF_VERSION },
      },
    });

    const stackNameField = page.testSubj.locator(
      'ecfDeploymentSection-unifiedLaunchButton-stackNameField'
    );
    await expect(stackNameField).toBeVisible();

    // Clear and type a custom stack name.
    await stackNameField.clear();
    await stackNameField.fill('my-company-forwarder');

    // Verify the edited value is reflected in session storage after the change.
    // We read the key directly rather than reloading so the test doesn't re-navigate.
    const stored = await page.evaluate((key: string) => {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, ECF_LAUNCH_STEP_SESSION_KEY);

    expect(stored?.stackNames?.unified).toBe('my-company-forwarder');
  });

  test('post-launch: invalid stack name shows inline error; Next button stays enabled', async ({
    browserAuth,
    page,
  }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: [ECF_SERVICE_ID],
      ecfLaunchStep: {
        launchedFamilies: ['unified'],
        stackVersions: { unified: MOCK_ECF_VERSION },
      },
    });

    const stackNameField = page.testSubj.locator(
      'ecfDeploymentSection-unifiedLaunchButton-stackNameField'
    );
    await expect(stackNameField).toBeVisible();

    // CFN stack names must start with a letter. A leading digit is invalid.
    await stackNameField.clear();
    await stackNameField.fill('1-invalid-start');
    // Blur to trigger the touched-state error check.
    await stackNameField.blur();

    // Inline validation error should appear (scoped to the form row).
    await expect(
      page.testSubj.locator('ecfDeploymentSection-unifiedLaunchButton-stackNameRow')
    ).toContainText('Stack name must start with a letter');

    // The field is optional — an invalid value must NOT block step completion.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
  });
});
