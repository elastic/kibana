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
// ec2_metrics: agentless metrics — no required text fields beyond region; Continue enabled once global region is set

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
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics', 'cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();
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

  test('endpoint count reflects selected services', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics', 'cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();
    await expect(page.getByText(/Showing.*2.*endpoints/)).toBeVisible();
  });

  test('search bar filters table rows by name', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics', 'cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-searchBox').fill('CloudTrail');
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')).toBeHidden();
    await expect(page.getByText(/Showing.*1.*endpoint/)).toBeVisible();
  });

  test('signal filter narrows table rows by signal type', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      // ec2_metrics = metrics, cloudtrail = logs
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics', 'cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

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
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics', 'cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({
          globalRegion: 'us-east-1',
          serviceVars: {
            cloudtrail: { trigger: 'aws-s3', vars: { region: 'eu-west-1' } },
          },
        })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    // ec2_metrics has no override — shows global region
    const ec2Row = page.getByRole('row', { name: /AWS EC2/ });
    await expect(ec2Row.getByText('us-east-1')).toBeVisible();

    // cloudtrail has per-service override
    const cloudtrailRow = page.getByRole('row', { name: /AWS CloudTrail/ });
    await expect(cloudtrailRow.getByText('eu-west-1')).toBeVisible();
  });

  test('Continue blocked without global region; error shown on click', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: '', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-continueButton').click();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-globalRegionError')).toBeVisible();
  });

  test('Continue blocked when required flyout fields are empty; form-level error lists service', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');

    // cloudtrail with S3 trigger: bucket_arn is required and empty
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({
          globalRegion: 'us-east-1',
          serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
        })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-continueButton').click();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-validationError')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-validationError')).toContainText(
      'AWS CloudTrail'
    );
  });

  test('expand icon opens flyout for the correct service', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-editButton-ec2_metrics').click();
    await expect(page.getByText('Collection settings — AWS EC2')).toBeVisible();

    await page.testSubj.locator('collectionSettingsFlyout-closeButton').click();
    await expect(page.getByText('Collection settings — AWS EC2')).toBeHidden();
  });

  test('service name link also opens flyout', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics').click();
    await expect(page.getByText('Collection settings — AWS EC2')).toBeVisible();
  });

  test('flyout shows transport toggle and required fields for dual-transport service', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({
          globalRegion: 'us-east-1',
          serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
        })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await expect(page.getByText('Collection settings — AWS CloudTrail')).toBeVisible();

    // Transport toggle visible in flyout
    await expect(page.testSubj.locator('collectionSettingsFlyout-transportToggle')).toBeVisible();

    // S3 active → bucket_arn field shown
    await expect(page.testSubj.locator('collectionSettingsFlyout-field-bucket_arn')).toBeVisible();
    await expect(
      page.testSubj.locator('collectionSettingsFlyout-field-log_group_arn')
    ).toBeHidden();

    // Switch to CloudWatch → log_group_arn shown, bucket_arn hidden
    await page.testSubj
      .locator('collectionSettingsFlyout-transportToggle')
      .getByText('CloudWatch')
      .click();
    await expect(
      page.testSubj.locator('collectionSettingsFlyout-field-log_group_arn')
    ).toBeVisible();
    await expect(page.testSubj.locator('collectionSettingsFlyout-field-bucket_arn')).toBeHidden();
  });

  test('filling required field in flyout and applying unblocks Continue', async ({
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['cloudtrail'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({
          globalRegion: 'us-east-1',
          serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
        })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    // Trigger validation
    await page.testSubj.locator('serviceSettingsStep-continueButton').click();
    await expect(page.testSubj.locator('serviceSettingsStep-validationError')).toBeVisible();

    // Open flyout, fill required field, apply
    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await page.testSubj
      .locator('collectionSettingsFlyout-field-bucket_arn')
      .fill('arn:aws:s3:::my-bucket');
    await page.getByRole('button', { name: 'Apply' }).click();

    // Validation error gone
    await expect(page.testSubj.locator('serviceSettingsStep-validationError')).toBeHidden();
  });

  test('flyout region override pre-populated with global region', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#service-settings');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'onboarding.aws.servicesStep',
        JSON.stringify({ selectedServiceIds: ['ec2_metrics'] })
      );
      sessionStorage.setItem(
        'onboarding.aws.serviceSettingsStep',
        JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
      );
    });
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-serviceSettings')).toBeVisible();

    await page.testSubj.locator('serviceSettingsStep-editButton-ec2_metrics').click();
    await expect(page.getByText('Collection settings — AWS EC2')).toBeVisible();

    await expect(page.locator('.euiFlyout').getByLabel('AWS Region (override)')).toHaveValue(
      'us-east-1'
    );
  });
});
