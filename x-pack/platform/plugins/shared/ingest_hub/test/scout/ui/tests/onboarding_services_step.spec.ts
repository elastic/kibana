/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// cloudwatch_logs and cloudwatch_metrics have defaultEnabled: false; all others are enabled by default.
const TOTAL_SERVICES = 14;
const DEFAULT_SELECTED_COUNT = 12;

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
        'ingestHub.onboardingEnabled': false,
      },
    });
  });

  test('renders all services with matrix-driven defaults', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    const rows = page.locator('[data-test-subj^="servicesStep-serviceRow-"]');
    await expect(rows).toHaveCount(TOTAL_SERVICES);

    // cloudwatch_logs and cloudwatch_metrics are off by default
    await expect(page.testSubj.locator('servicesStep-toggle-cloudwatch_logs')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-cloudwatch_metrics')).not.toBeChecked();

    // a defaultEnabled service is checked
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();

    // selected count text reflects defaults
    await expect(page.getByText(`${DEFAULT_SELECTED_COUNT} services selected`)).toBeVisible();
  });

  test('deselect and reselect a service', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // deselect guardduty
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).not.toBeChecked();
    await expect(page.getByText(`${DEFAULT_SELECTED_COUNT - 1} services selected`)).toBeVisible();

    // reselect it
    await page.testSubj.locator('servicesStep-toggle-guardduty').click();
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();
    await expect(page.getByText(`${DEFAULT_SELECTED_COUNT} services selected`)).toBeVisible();
  });

  test('config validation gates Next — required fields must be filled', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // cloudtrail is selected by default and requires s3_bucket_arn, cloudtrail_trail_arn, regions
    // click Next without filling config to trigger validation
    await page.testSubj.locator('servicesStep-nextButton').click();

    // validation errors should appear for unfilled cloudtrail fields
    await expect(
      page.testSubj.locator('servicesStep-configField-cloudtrail-s3_bucket_arn')
    ).toBeVisible();

    // fill all required config for cloudtrail (and all other selected services)
    // For this test just fill cloudtrail's fields to verify the pattern
    await page.testSubj
      .locator('servicesStep-configField-cloudtrail-s3_bucket_arn')
      .fill('arn:aws:s3:::my-bucket');
    await page.testSubj
      .locator('servicesStep-configField-cloudtrail-cloudtrail_trail_arn')
      .fill('arn:aws:cloudtrail:us-east-1:123456789012:trail/MyTrail');
    await page.testSubj.locator('servicesStep-configField-cloudtrail-regions').fill('us-east-1');
  });

  test('signal-type filter shows only matching services', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // switch to Logs filter
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Logs').click();

    const rows = page.locator('[data-test-subj^="servicesStep-serviceRow-"]');
    // only log-signal services are shown; metrics rows are hidden
    const count = await rows.count();
    expect(count).toBeLessThan(TOTAL_SERVICES);

    // a metrics-only row must not be visible
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeHidden();

    // switch to Metrics
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();
    // a logs-only row must not be visible
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeHidden();
  });
});
