/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { BrowserAuthFixture, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import type { ServiceVars } from '../../../../public/onboarding/step_components/service_settings_step/use_service_settings';

// elb (DS: elb_logs, managed_integration): dual-transport S3+CloudWatch.
// Used here because:
//   - agentless.enabled → managed_integration preferred → ManagedIntegrationsSection renders
//   - no hide_in_var_group_options → identityFederationSupported=true → radio shown
// The test seeds S3-only enabledInputs so the POST body has exactly elb-aws-s3 enabled.

const SERVICES_STEP_SESSION_KEY = 'onboarding.aws.servicesStep';
const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

// Minimal aws manifest with a version field (needed by deployGroup to resolve pkgVersion)
// and an elb policy template that drives the managed-integration deploy path.
const MOCK_AWS_PACKAGE_RESPONSE_WITH_VERSION = {
  item: {
    version: '7.1.1',
    policy_templates: [
      {
        name: 'elb',
        title: 'AWS ELB',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }],
      },
    ],
    data_streams: [
      {
        path: 'elb_logs',
        type: 'logs',
        streams: [
          {
            input: 'aws-s3',
            vars: [
              {
                name: 'bucket_arn',
                type: 'text',
                title: 'Bucket ARN',
                required: true,
                show_user: true,
              },
            ],
          },
          {
            input: 'aws-cloudwatch',
            vars: [
              {
                name: 'log_group_arn',
                type: 'text',
                title: 'Log Group ARN',
                required: true,
                show_user: true,
              },
            ],
          },
        ],
      },
    ],
  },
};

async function mockAWSPackageWithVersion(page: ScoutPage): Promise<void> {
  await page.route(
    (url) => /\/api\/fleet\/epm\/packages\/aws$/.test(url.pathname),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AWS_PACKAGE_RESPONSE_WITH_VERSION),
      })
  );
}

async function navigateToDeployStep(
  browserAuth: BrowserAuthFixture,
  page: ScoutPage,
  opts: {
    selectedServiceIds: string[];
    globalRegion?: string;
    serviceVars?: Record<string, ServiceVars>;
  }
): Promise<void> {
  const { selectedServiceIds, globalRegion = 'us-east-1', serviceVars = {} } = opts;
  await browserAuth.loginAsAdmin();
  await page.gotoApp('onboarding/aws#authenticate-and-deploy');
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
      vars: Record<string, ServiceVars>;
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
  await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
}

test.describe('Onboarding Authenticate and Deploy step', { tag: tags.stateful.classic }, () => {
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

  test.beforeEach(async ({ page }) => {
    await mockAWSPackageWithVersion(page);
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

  test('deploy POSTs correct inputs for a pre-configured S3-only elb service', async ({
    browserAuth,
    page,
  }) => {
    // Pre-configure elb with S3 input enabled and a bucket ARN.
    // Only aws-s3 is in enabledInputs so only elb-aws-s3 should be enabled in the POST body.
    await navigateToDeployStep(browserAuth, page, {
      selectedServiceIds: ['elb'],
      globalRegion: 'us-east-1',
      serviceVars: {
        elb: {
          enabledDataStreams: ['elb_logs'],
          varsByDataStream: {
            elb_logs: {
              enabledInputs: ['aws-s3'],
              varsByInput: {
                'aws-s3': { bucket_arn: 'arn:aws:s3:::test-bucket', region: 'us-east-1' },
              },
            },
          },
        },
      },
    });

    // Intercept the managed integrations create call before clicking Deploy.
    const deployRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/managed_integrations$/.test(new URL(req.url()).pathname)
    );

    // Mock the deploy endpoint so it returns success without hitting Fleet.
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { policy_ids: ['mock-policy-id'] } }),
        })
    );

    // elb has identityFederationSupported=true → radio shown, default=identity_federation.
    // Switch to Access Keys so the static-keys form appears.
    await page.getByLabel('Access Keys').click();

    // Fill credentials to satisfy onReadyChange → enables Deploy button.
    const accessKeyField = page.testSubj.locator('awsStaticKeysForm-accessKeyId').locator('input');
    const secretKeyField = page.testSubj
      .locator('awsStaticKeysForm-secretAccessKey')
      .locator('input');
    await accessKeyField.fill('AKIATEST');
    await secretKeyField.fill('secrettest');

    await expect(page.testSubj.locator('managedIntegrationsSection-deployButton')).toBeEnabled();
    await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

    const deployRequest = await deployRequestPromise;
    const body = deployRequest.postDataJSON() as {
      inputs: Record<
        string,
        {
          enabled: boolean;
          streams: Record<string, { enabled: boolean; vars: Record<string, unknown> }>;
        }
      >;
    };

    // S3 input must be enabled with the correct stream and bucket_arn var.
    expect(body.inputs['elb-aws-s3']).toBeDefined();
    expect(body.inputs['elb-aws-s3'].enabled).toBe(true);
    expect(body.inputs['elb-aws-s3'].streams['aws.elb_logs']).toBeDefined();
    expect(body.inputs['elb-aws-s3'].streams['aws.elb_logs'].enabled).toBe(true);
    expect(body.inputs['elb-aws-s3'].streams['aws.elb_logs'].vars.bucket_arn).toBe(
      'arn:aws:s3:::test-bucket'
    );

    // CloudWatch input must be present but disabled (it was not in enabledInputs).
    expect(body.inputs['elb-aws-cloudwatch']).toBeDefined();
    expect(body.inputs['elb-aws-cloudwatch'].enabled).toBe(false);
  });
});
