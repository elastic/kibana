/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockEcfOnlyServicePackages } from '../helpers/ecf_only_services';
import {
  expectOnboardingStepVisible,
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';

// Services are shown in one flat list, sorted by name.
// No services are selected by default — the user must pick them.

test.describe('Onboarding services step', { tag: tags.stateful.classic }, () => {
  useOnboardingFeatureFlag();

  test('renders step header, data schema cards and the service list', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expectOnboardingStepVisible(page, 'services');

    await expect(page.getByText('Which AWS services do you want to monitor?')).toBeVisible();

    await expect(page.testSubj.locator('servicesStep-dataSchemaSection')).toBeVisible();

    // all services are listed together, regardless of the AWS console category
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();

    // no services are selected on first load
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-serviceRow-waf')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).not.toBeChecked();
  });

  test('select and deselect a service', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expectOnboardingStepVisible(page, 'services');

    // guardduty starts unchecked; click to select
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();

    // click again to deselect
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
  });

  test('select all and deselect all', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expectOnboardingStepVisible(page, 'services');

    // nothing selected → "Select all" is shown
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeHidden();

    // select all → services across the whole list get checked
    await page.testSubj.locator('servicesStep-selectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-dynamodb')).toBeChecked();

    // all selected → button flips to "Deselect all"
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeHidden();

    // deselect all → everything unchecked again
    await page.testSubj.locator('servicesStep-deselectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).not.toBeChecked();
  });

  test('Continue is disabled when no services are selected', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expectOnboardingStepVisible(page, 'services');

    // no services selected on first load — Continue is disabled
    await expect(page.testSubj.locator('servicesStep-continueButton')).toBeDisabled();

    // selecting a service enables Continue
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-continueButton')).toBeEnabled();
  });

  test('signal-type filter hides services with no matching signal', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expectOnboardingStepVisible(page, 'services');

    // All: guardduty (logs-only) and dynamodb (metrics-only) are both listed
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();

    // Logs: dynamodb has no log signal, so it disappears
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Logs').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeHidden();

    // Metrics: guardduty is logs-only, so it disappears
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeHidden();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();

    // Back to All: both are listed again
    await page.testSubj.locator('servicesStep-signalFilter').getByText('All').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();
  });

  // ECF-only services (OTel format) can only be deployed through ECF.
  test('ecf-only services: warns when one is selected', async ({ browserAuth, page }) => {
    await mockEcfOnlyServicePackages(page);
    await navigateToOnboardingStep(browserAuth, page, 'services', {
      dataFormat: 'otel',
      selectedServiceIds: [],
    });
    const callout = page.testSubj.locator('servicesStep-ecfOnlyCallout');
    await expect(callout).toBeHidden();

    await page.testSubj.locator('servicesStep-toggle-waf_otel').click();
    await expect(callout).toBeVisible();
    await expect(callout).toContainText('AWS WAF');

    await page.testSubj.locator('servicesStep-toggle-waf_otel').click();
    await expect(callout).toBeHidden();
  });

  test('ecf-only services: cannot be selected while agent-based is the deployment method', async ({
    browserAuth,
    page,
  }) => {
    await mockEcfOnlyServicePackages(page);
    await navigateToOnboardingStep(browserAuth, page, 'services', {
      dataFormat: 'otel',
      selectedServiceIds: [],
      authenticateAndDeployStep: { deploymentMethod: 'agent_based' },
    });

    const toggle = page.testSubj.locator('servicesStep-toggle-waf_otel');
    await expect(toggle).toBeDisabled();

    await page.testSubj.locator('servicesStep-serviceRow-waf_otel').hover();
    await expect(
      page.getByText("Agent-based deployment doesn't support this service.")
    ).toBeVisible();

    // Select all skips the unavailable services.
    await page.testSubj.locator('servicesStep-selectAllButton').click();
    await expect(toggle).not.toBeChecked();
  });
});
