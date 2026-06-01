/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// 54 individual data streams with showInUI: true collapse to 40 groups (by policyTemplate).
// 6 of those groups are not default-selected:
// cloudwatch (cloudwatch_logs + cloudwatch_metrics), cloudtrail_otel, vpcflow_otel, waf_otel, aws_logs, firehose.
const TOTAL_GROUPS = 40;
const DEFAULT_SELECTED_COUNT = 34;

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

  test('renders all service groups with matrix-driven defaults', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    const rows = page.locator('[data-test-subj^="servicesStep-serviceRow-"]');
    await expect(rows).toHaveCount(TOTAL_GROUPS);

    // groups not default-selected are unchecked
    await expect(page.testSubj.locator('servicesStep-toggle-cloudwatch')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-cloudtrail_otel')).not.toBeChecked();
    await expect(page.testSubj.locator('servicesStep-toggle-firehose')).not.toBeChecked();

    // a default-selected group is checked
    await expect(page.testSubj.locator('servicesStep-toggle-guardduty')).toBeChecked();

    // selected count text reflects defaults
    await expect(page.getByText(`${DEFAULT_SELECTED_COUNT} services selected`)).toBeVisible();
  });

  test('deselect and reselect a service group', async ({ browserAuth, page }) => {
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

  test('Next is disabled when no services are selected', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // Next is enabled while services are selected (defaults have selections)
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeEnabled();

    // deselect all services via "Deselect all"
    await page.testSubj.locator('servicesStep-deselectAllButton').click();
    await expect(page.getByText('0 services selected')).toBeVisible();

    // Next must be disabled with nothing selected
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeDisabled();

    // re-selecting any group re-enables Next
    await page.testSubj.locator(`servicesStep-toggle-cloudtrail`).click();
    await expect(page.testSubj.locator('servicesStep-nextButton')).toBeEnabled();
  });

  test('signal-type filter shows only matching service groups', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#services');
    await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();

    // switch to Logs filter
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Logs').click();

    // wait for a metrics-only group to disappear before counting (ensures DOM has settled)
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeHidden();

    const rows = page.locator('[data-test-subj^="servicesStep-serviceRow-"]');
    // only groups with at least one log-signal entry are shown
    const count = await rows.count();
    expect(count).toBeLessThan(TOTAL_GROUPS);

    // switch to Metrics
    await page.testSubj.locator('servicesStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('servicesStep-serviceRow-dynamodb')).toBeVisible();
    // a logs-only group must not be visible
    await expect(page.testSubj.locator('servicesStep-serviceRow-guardduty')).toBeHidden();
  });
});
