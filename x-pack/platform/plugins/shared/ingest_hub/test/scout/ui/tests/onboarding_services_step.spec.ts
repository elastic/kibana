/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// 54 services have showInUI: true. 7 of those have defaultEnabled: false:
// cloudwatch_logs, cloudwatch_metrics, cloudtrail_otel, vpcflow_otel, waf_otel, aws_logs, firehose.
// Services are grouped by category; only the active category's rows are rendered in the DOM.
// Default active category: Security, Identity and Compliance (first in CATEGORY_ORDER).

test.describe('Onboarding services step', { tag: tags.stateful.classic }, () => {
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
        'ingestHub.onboardingEnabled': 'false',
      },
    });
  });

  test('renders step header, region field, and default category view', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // title and region field are present
    await expect(page.getByText('Which AWS services do you want to monitor?')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-regionComboBox')).toBeVisible();

    // Security, Identity and Compliance is the default active category
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeVisible();

    // guardduty (defaultEnabled: true) is checked
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();

    // waf_otel (defaultEnabled: false) is visible but unchecked
    await expect(page.testSubj.locator('servicesStep-serviceRow-waf_otel')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-toggle-waf_otel')).not.toBeChecked();
  });

  test('deselect and reselect a service', async ({ page }) => {
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // guardduty is in Security (active by default)
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();

    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();
  });

  test('per-category select all and deselect all', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // waf_otel is unchecked by default → "Select all" is shown for Security
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeHidden();

    // select all in the active category → waf_otel gets checked
    await page.testSubj.locator('servicesStep-selectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-waf_otel')).toBeChecked();

    // all selected → button flips to "Deselect all"
    await expect(page.testSubj.locator('servicesStep-deselectAllButton')).toBeVisible();
    await expect(page.testSubj.locator('servicesStep-selectAllButton')).toBeHidden();

    // deselect all → all Security services unchecked
    await page.testSubj.locator('servicesStep-deselectAllButton').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-waf_otel')).not.toBeChecked();
  });

  test('Next is disabled when no services are selected', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // defaults have selections — Next is enabled
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeEnabled();

    // clear all selections via session storage and reload
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: [], defaultRegion: 'us-east-1' })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // Next must be disabled with nothing selected
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeDisabled();

    // selecting any service re-enables Next (Security is active, guardduty is visible)
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeEnabled();
  });

  test('signal-type filter hides categories with no matching services', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // Databases is visible in "All" mode (dynamodb, rds are metrics-only)
    await expect(page.locator('[data-test-subj="servicesStep-category-Databases"]')).toBeVisible();

    // switch to Logs — Databases has no log-signal services, so it disappears from sidebar
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Logs').click();
    await expect(page.locator('[data-test-subj="servicesStep-category-Databases"]')).toBeHidden();

    // switch to Metrics — Databases reappears; navigate to it
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.locator('[data-test-subj="servicesStep-category-Databases"]')).toBeVisible();
    await page.locator('[data-test-subj="servicesStep-category-Databases"]').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();

    // navigate to Security — guardduty is logs-only so it is not rendered with Metrics filter
    await page
      .locator('[data-test-subj="servicesStep-category-Security, Identity and Compliance"]')
      .click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeHidden();
  });
});
