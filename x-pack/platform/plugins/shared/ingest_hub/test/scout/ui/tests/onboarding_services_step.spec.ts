/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Services are grouped by category; only the active category's rows are rendered in the DOM.
// Default active category: security_identity_compliance (first in CATEGORY_ORDER).
// No services are selected by default — the user must pick them.

test.describe('Onboarding services step', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices, config }) => {
    // The /internal/core/_settings route is only registered when
    // coreApp.allowDynamicConfigOverrides=true (Scout's local stateful base config).
    // ECH deployments don't carry that override, so the PUT 404s. Skip on Cloud.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      config.isCloud === true,
      `Core API returns 404 for 'ingestHub.onboardingEnabled' on ECH`
    );
    // skip() in beforeAll only skips the tests, not the hook body itself.
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

  test('renders step header and default category view', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    await expect(page.getByText('Which AWS services do you want to monitor?')).toBeVisible();

    // security_identity_compliance is the default active category
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();

    // no services are selected on first load
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-serviceRow-waf')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).not.toBeChecked();
  });

  test('select and deselect a service', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // guardduty starts unchecked; click to select
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();

    // click again to deselect
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
  });

  test('per-category select all and deselect all', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // nothing selected → "Select all" is shown for Security
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeHidden();

    // select all in the active category → waf gets checked
    await page.testSubj.locator('servicesStep-selectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).toBeChecked();

    // all selected → button flips to "Deselect all"
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeHidden();

    // deselect all → all Security services unchecked
    await page.testSubj.locator('servicesStep-deselectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-waf')).not.toBeChecked();
  });

  test('Continue is disabled when no services are selected', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // no services selected on first load — Continue is disabled
    await expect(page.testSubj.locator('servicesStep-continueButton')).toBeDisabled();

    // selecting a service enables Continue
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-continueButton')).toBeEnabled();
  });

  test('signal-type filter hides categories with no matching services', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // Databases is visible in "All" mode (dynamodb, rds are metrics-only)
    await expect(page.testSubj.locator('servicesStep-category-databases')).toBeVisible();

    // switch to Logs — Databases has no log-signal services, so it disappears from sidebar
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Logs').click();
    await expect(page.testSubj.locator('servicesStep-category-databases')).toBeHidden();

    // navigate to Security in All mode, then switch to Metrics:
    // guardduty is logs-only so its row disappears without needing to click a hidden category
    await page.testSubj.locator('servicesStep-category-security_identity_compliance').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeHidden();

    // switch back to All — Databases reappears; navigate to it and verify dynamodb row
    await page.testSubj.locator('servicesStep-signalFilter').getByText('All').click();
    await page.testSubj.locator('servicesStep-category-databases').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();

    // Metrics filter on Databases view — dynamodb stays visible (it is a metrics service)
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();
  });
});
