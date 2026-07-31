/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// cloudtrail: dual-transport (S3 + CloudWatch); required fields are bucket_arn (S3) / log_group_arn (CW)
// ec2_metrics: agentless metrics — no required text fields; Continue enabled once global region is set
// firewall_metrics: regions-only optionalConfig — no required text fields, no attention badge

const SERVICES_STEP_SESSION_KEY = 'onboarding.aws.servicesStep';
const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

async function navigateToServiceSettings(
  browserAuth: any,
  page: any,
  opts: {
    selectedServiceIds: string[];
    globalRegion?: string;
    serviceVars?: Record<string, unknown>;
  }
): Promise<void> {
  const { selectedServiceIds, globalRegion = 'us-east-1', serviceVars = {} } = opts;
  await browserAuth.loginAsAdmin();
  await page.gotoApp('onboarding/aws#service-settings');
  await page.evaluate(
    ({
      ids,
      region,
      vars,
      servicesKey,
      settingsKey,
    }: {
      ids: string[];
      region: string;
      vars: Record<string, unknown>;
      servicesKey: string;
      settingsKey: string;
    }) => {
      sessionStorage.setItem(servicesKey, JSON.stringify({ selectedServiceIds: ids }));
      sessionStorage.setItem(
        settingsKey,
        JSON.stringify({ globalRegion: region, serviceVars: vars })
      );
    },
    {
      ids: selectedServiceIds,
      region: globalRegion,
      vars: serviceVars,
      servicesKey: SERVICES_STEP_SESSION_KEY,
      settingsKey: SERVICE_SETTINGS_SESSION_KEY,
    }
  );
  await page.reload();
  await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();
}

test.describe('Onboarding Service Settings step', { tag: tags.stateful.classic }, () => {
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

  test('renders table with Service Name, Collects, Category, Region columns', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
    });
    await expect(page.testSubj.locator('serviceSettingsStep-table')).toBeVisible();

    // Column headers
    await expect(page.getByRole('columnheader', { name: 'Service Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collects' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Region' })).toBeVisible();

    // Both services appear as rows
    await expect(
      page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
  });

  test('service count reflects selected services', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
    });
    await expect(page.getByText(/Showing.*2.*services/)).toBeVisible();
  });

  test('search bar filters table rows by name', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-searchBox').fill('CloudTrail');
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')).toBeHidden();
    await expect(page.getByText(/Showing.*1.*service/)).toBeVisible();
  });

  test('signal filter narrows table rows by signal type', async ({ browserAuth, page }) => {
    // ec2_metrics = metrics, cloudtrail = logs
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
    });

    // Filter to Metrics — only ec2_metrics visible
    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Metrics').click();
    await expect(
      page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeHidden();

    // Filter to Logs — only cloudtrail visible
    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Logs').click();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')).toBeHidden();
  });

  test('global region shown in Region column; per-service override takes precedence', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: { region: 'eu-west-1' } } },
    });

    // ec2_metrics has no override — shows global region
    const ec2Row = page.getByRole('row', { name: /AWS EC2/ });
    await expect(ec2Row.getByText('us-east-1')).toBeVisible();

    // cloudtrail has per-service override
    const cloudtrailRow = page.getByRole('row', { name: /AWS CloudTrail/ });
    await expect(cloudtrailRow.getByText('eu-west-1')).toBeVisible();
  });

  test('Continue is disabled without global region', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics'],
      globalRegion: '',
    });

    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();
  });

  test('region error shown only after touching and clearing the global region field', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics'],
      globalRegion: '',
    });

    // Error not visible before interaction
    await expect(page.testSubj.locator('serviceSettingsStep-globalRegionError')).toBeHidden();

    // Select a region then clear it
    await page.testSubj.locator('serviceSettingsStep-globalRegion').click();
    await page.getByRole('button', { name: 'Clear input' }).click();

    await expect(page.testSubj.locator('serviceSettingsStep-globalRegionError')).toBeVisible();
  });

  test('attention callout and badge shown when required flyout fields are empty', async ({
    browserAuth,
    page,
  }) => {
    // cloudtrail with S3 trigger: bucket_arn is required and empty
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    // Callout visible, badge on cloudtrail row, Continue disabled
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(
      page.testSubj.locator('serviceSettingsStep-attentionIcon-cloudtrail')
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();
  });

  test('regions-only service shows no attention badge and does not block Continue', async ({
    browserAuth,
    page,
  }) => {
    // firewall_metrics: optionalConfig: ['regions'] — no required text fields
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['firewall_metrics'],
    });

    await expect(
      page.testSubj.locator('serviceSettingsStep-attentionIcon-firewall_metrics')
    ).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  test('expand icon opens flyout for the correct service', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-ec2_metrics').click();
    await expect(page.getByRole('heading', { name: 'AWS EC2' })).toBeVisible();

    await page.testSubj.locator('serviceSettingsFlyout-closeButton').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeHidden();
  });

  test('service name link also opens flyout', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics'],
    });

    await page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();
  });

  test('flyout shows transport toggle and required fields for dual-transport service', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();

    // Transport toggle visible
    await expect(page.testSubj.locator('serviceSettingsFlyout-transportToggle')).toBeVisible();

    // S3 active → bucket_arn field shown (label includes [S3])
    await expect(page.testSubj.locator('serviceSettingsFlyout-field-bucket_arn')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsFlyout-field-log_group_arn')).toBeHidden();

    // Switch to CloudWatch → log_group_arn shown, bucket_arn hidden
    await page.testSubj
      .locator('serviceSettingsFlyout-transportToggle')
      .getByText('CloudWatch')
      .click();
    await expect(page.testSubj.locator('serviceSettingsFlyout-field-log_group_arn')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsFlyout-field-bucket_arn')).toBeHidden();
  });

  test('filling required field in flyout and saving unblocks Continue', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    // Callout and badge visible, Continue disabled
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

    // Open flyout, fill required field, save
    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .fill('arn:aws:s3:::my-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

    // Badge gone, callout gone, Continue enabled
    await expect(
      page.testSubj.locator('serviceSettingsStep-attentionIcon-cloudtrail')
    ).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  test('flyout region override pre-populated with global region', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2_metrics'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-ec2_metrics').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();

    await expect(
      page.testSubj.locator('serviceSettingsFlyout').getByLabel('AWS Region (override)')
    ).toHaveValue('us-east-1');
  });
});
