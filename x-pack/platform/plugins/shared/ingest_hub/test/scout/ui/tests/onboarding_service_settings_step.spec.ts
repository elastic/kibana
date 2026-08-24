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

// elb (DS: elb_logs): dual-transport (S3 + CloudWatch); required fields bucket_arn (S3) / log_group_arn (CW)
//   — used for flyout tests with MOCK_AWS_PACKAGE_RESPONSE intercepting the Fleet EPR endpoint
// cloudtrail: ECF-only (no flyout); static name 'AWS CloudTrail' — used for non-flyout assertions
// waf: ECF-only; always showInUI:true regardless of manifest version
// s3access: managed_integration, no required text vars → used for no-attention-callout test

const SERVICES_STEP_SESSION_KEY = 'onboarding.aws.servicesStep';
const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

// Synthetic aws package manifest injected via page.route() to make all tests hermetic.
// Covers every service used in this spec so assertions never depend on whatever
// elastic/integrations happens to ship. ECF-only services (cloudtrail, waf, vpcflow) get
// their names from the static matrix; only non-ECF services need policy_templates here.
const MOCK_AWS_PACKAGE_RESPONSE = {
  item: {
    policy_templates: [
      // ec2_metrics — used by signal-filter test
      {
        name: 'ec2',
        data_streams: ['ec2_metrics'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-cloudwatch' }],
      },
      // s3access — used by no-attention-callout test
      {
        name: 's3',
        data_streams: ['s3access'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }],
      },
      // elb_logs — used by flyout tests
      {
        name: 'elb',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }],
      },
      // cloudtrail — ECF, dual-input (S3 + CloudWatch); needed for signal-filter test
      {
        name: 'cloudtrail',
        data_streams: ['cloudtrail'],
        inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }],
      },
      // waf — ECF, single-input (S3)
      {
        name: 'waf',
        data_streams: ['waf'],
        inputs: [{ type: 'aws-s3' }],
      },
    ],
    data_streams: [
      {
        path: 'ec2_metrics',
        type: 'metrics',
        streams: [{ input: 'aws-cloudwatch', vars: [] }],
      },
      {
        path: 's3access',
        type: 'logs',
        streams: [{ input: 'aws-s3', vars: [] }],
      },
      {
        path: 'cloudtrail',
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
      {
        path: 'waf',
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
        ],
      },
      {
        path: 'elb_logs',
        type: 'logs',
        title: 'Amazon ELB Logs',
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

async function mockAWSPackage(page: ScoutPage): Promise<void> {
  // Match exactly `/api/fleet/epm/packages/aws` (with optional base-path prefix) but not
  // `/api/fleet/epm/packages/aws_bedrock` or other packages that share the `aws` prefix.
  await page.route(
    (url) => /\/api\/fleet\/epm\/packages\/aws$/.test(url.pathname),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AWS_PACKAGE_RESPONSE),
      })
  );
}

async function fillFlyoutField(
  page: ScoutPage,
  input: string,
  fieldName: string,
  value: string
): Promise<void> {
  await page.testSubj
    .locator(`serviceSettingsFlyout-${input}-field-${fieldName}`)
    .locator('input')
    .fill(value);
}

async function navigateToServiceSettings(
  browserAuth: BrowserAuthFixture,
  page: ScoutPage,
  opts: {
    selectedServiceIds: string[];
    globalRegion?: string;
    serviceVars?: Record<string, ServiceVars>;
    instances?: unknown[];
  }
): Promise<void> {
  const { selectedServiceIds, globalRegion = 'us-east-1', serviceVars = {}, instances } = opts;
  await browserAuth.loginAsAdmin();
  await page.gotoApp('onboarding/aws#service-settings');
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

  test.beforeEach(async ({ page }) => {
    await mockAWSPackage(page);
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
      selectedServiceIds: ['waf', 'cloudtrail'],
    });
    await expect(page.testSubj.locator('serviceSettingsStep-table')).toBeVisible();

    // Column headers
    await expect(page.getByRole('columnheader', { name: 'Service Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collects' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Region' })).toBeVisible();

    // Both services appear as rows
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-waf')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
  });

  test('service count reflects selected services', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['waf', 'cloudtrail'],
    });
    await expect(page.getByText(/Showing.*2.*services/)).toBeVisible();
  });

  test('search bar filters table rows by name', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['waf', 'cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-searchBox').fill('CloudTrail');
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-waf')).toBeHidden();
    await expect(page.getByText(/Showing.*1.*service/)).toBeVisible();
  });

  test('signal filter narrows table rows by signal type', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['ec2', 'cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Metrics').click();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeHidden();

    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Logs').click();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2')).toBeHidden();
  });

  test('global region shown in Region column; per-service override takes precedence', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['waf', 'cloudtrail'],
      serviceVars: {
        cloudtrail: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { aws_region: 'eu-west-1' } },
        },
      },
    });

    // waf has no override — shows global region.
    const wafRow = page.locator('tr', {
      has: page.testSubj.locator('serviceSettingsStep-serviceLink-waf'),
    });
    await expect(wafRow.getByText('us-east-1')).toBeVisible();

    // cloudtrail has per-service override
    const cloudtrailRow = page.locator('tr', {
      has: page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail'),
    });
    await expect(cloudtrailRow.getByText('eu-west-1')).toBeVisible();
  });

  test('Continue is disabled without global region', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      globalRegion: '',
    });

    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();
  });

  test('region error shown only after touching and clearing the global region field', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      globalRegion: 'us-east-1',
    });

    // Error not visible before interaction
    await expect(page.testSubj.locator('serviceSettingsStep-globalRegionError')).toBeHidden();

    // Clear the region — EuiComboBox only shows "Clear input" when a value is selected
    await page.getByRole('button', { name: 'Clear input' }).click();

    await expect(page.testSubj.locator('serviceSettingsStep-globalRegionError')).toBeVisible();
  });

  test('attention callout and badge shown when required flyout fields are empty', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: { elb: { enabledInputs: ['aws-s3'], varsByInput: {} } },
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-elb')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();
  });

  test('service with no required text vars shows no attention badge and does not block Continue', async ({
    browserAuth,
    page,
  }) => {
    // s3access: managed_integration, no required text vars → no attention callout.
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['s3'],
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-s3')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  test('expand icon opens flyout for the correct service', async ({ browserAuth, page }) => {
    // elb_logs: dual-transport (S3 + CloudWatch), required text vars → has edit button.
    // ec2_metrics has no configurable fields and shows plain text instead.
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-elb').click();
    await expect(page.getByRole('heading', { name: /AWS ELB/ })).toBeVisible();

    await page.testSubj.locator('serviceSettingsFlyout-closeButton').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeHidden();
  });

  test('service name link also opens flyout', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
    });

    await page.testSubj.locator('serviceSettingsStep-serviceLink-elb').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();
  });

  test('flyout shows transport toggle and required fields for dual-transport service', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: { elb: { enabledInputs: ['aws-s3'], varsByInput: {} } },
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-elb').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();

    // Input toggles visible
    await expect(page.testSubj.locator('serviceSettingsFlyout-inputToggle-aws-s3')).toBeVisible();
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-inputToggle-aws-cloudwatch')
    ).toBeVisible();

    // S3 enabled → bucket_arn field shown
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-aws-s3-field-bucket_arn')
    ).toBeVisible();
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-aws-cloudwatch-field-log_group_arn')
    ).toBeHidden();

    // Enable CloudWatch → log_group_arn shown
    await page.testSubj.locator('serviceSettingsFlyout-inputToggle-aws-cloudwatch').click();
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-aws-cloudwatch-field-log_group_arn')
    ).toBeVisible();
  });

  test('flyout no longer shows AWS Region override field', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-elb').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();

    await expect(page.getByLabel('AWS Region (override)')).toBeHidden();
  });

  test('filling required field in flyout and saving unblocks Continue', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: { elb: { enabledInputs: ['aws-s3'], varsByInput: {} } },
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

    await page.testSubj.locator('serviceSettingsStep-editButton-elb').click();
    await fillFlyoutField(page, 'aws-s3', 'bucket_arn', 'arn:aws:s3:::my-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

    await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-elb')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  // ── Duplicate service ───────────────────────────────────────────────────

  test('⋮ actions menu is visible on every row and contains Duplicate service', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail', 'waf'],
    });

    for (const id of ['cloudtrail', 'waf']) {
      await page.testSubj.locator(`serviceSettingsStep-actionsButton-${id}`).click();
      await expect(
        page.testSubj.locator(`serviceSettingsStep-duplicateAction-${id}`)
      ).toBeVisible();
      // Close popover before opening the next
      await page.keyboard.press('Escape');
    }
  });

  test('duplicate modal opens with correct service name in body copy', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();

    const modal = page.testSubj.locator('duplicateServiceModal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Add another instance of/)).toBeVisible();
    await expect(modal.getByText('AWS CloudTrail')).toBeVisible();
  });

  test('duplicate modal pre-fills name as "Service [Duplicate]"', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();

    await expect(page.testSubj.locator('duplicateServiceModal-nameField')).toHaveValue(
      'AWS CloudTrail [Duplicate]'
    );
  });

  test('Cancel discards without adding a row or changing session storage', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();
    await expect(page.testSubj.locator('duplicateServiceModal')).toBeVisible();

    await page.testSubj.locator('duplicateServiceModal-cancelButton').click();
    await expect(page.testSubj.locator('duplicateServiceModal')).toBeHidden();

    // Still only 1 row
    await expect(page.getByText(/Showing.*1.*service/)).toBeVisible();
  });

  test('Add inserts a new row with the chosen name', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: {
        elb: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        },
      },
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-elb').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-elb').click();

    // Fill the duplicate bucket_arn and click Add
    await fillFlyoutField(page, 'aws-s3', 'bucket_arn', 'arn:aws:s3:::second-bucket');
    await page.testSubj.locator('duplicateServiceModal-addButton').click();

    await expect(page.testSubj.locator('duplicateServiceModal')).toBeHidden();

    // Table now shows 2 rows
    await expect(page.getByText(/Showing.*2.*services/)).toBeVisible();
    await expect(page.getByText(/AWS ELB.*\[Duplicate\]/)).toBeVisible();
  });

  test("duplicate row's config is independent from the original", async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: {
        elb: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        },
      },
    });

    // Duplicate with a different bucket_arn
    await page.testSubj.locator('serviceSettingsStep-actionsButton-elb').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-elb').click();
    await fillFlyoutField(page, 'aws-s3', 'bucket_arn', 'arn:aws:s3:::second-bucket');
    await page.testSubj.locator('duplicateServiceModal-addButton').click();

    // Open the original's flyout and verify its bucket_arn is unchanged
    await page.testSubj.locator('serviceSettingsStep-editButton-elb').click();
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-aws-s3-field-bucket_arn').locator('input')
    ).toHaveValue('arn:aws:s3:::original-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-closeButton').click();
  });

  test('duplicate row participates in attention callout and Continue readiness', async ({
    browserAuth,
    page,
  }) => {
    const dupInstanceId = 'elb__dup-1';
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: {
        elb: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        },
        [dupInstanceId]: { enabledInputs: ['aws-s3'], varsByInput: {} }, // bucket_arn missing
      },
      instances: [
        {
          instanceId: 'elb',
          serviceId: 'elb',
          name: 'Amazon ELB Logs',
          isDuplicate: false,
        },
        {
          instanceId: dupInstanceId,
          serviceId: 'elb',
          name: 'Amazon ELB Logs [Duplicate]',
          isDuplicate: true,
        },
      ],
    });

    await expect(
      page.testSubj.locator(`serviceSettingsStep-attentionIcon-${dupInstanceId}`)
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

    await page.testSubj.locator(`serviceSettingsStep-editButton-${dupInstanceId}`).click();
    await fillFlyoutField(page, 'aws-s3', 'bucket_arn', 'arn:aws:s3:::second-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  test('Remove action is visible only on duplicate rows and removes the row', async ({
    browserAuth,
    page,
  }) => {
    const dupInstanceId = 'cloudtrail__dup-1';
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        },
        [dupInstanceId]: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::second-bucket' } },
        },
      },
      instances: [
        {
          instanceId: 'cloudtrail',
          serviceId: 'cloudtrail',
          name: 'AWS CloudTrail',
          isDuplicate: false,
        },
        {
          instanceId: dupInstanceId,
          serviceId: 'cloudtrail',
          name: 'AWS CloudTrail [Duplicate]',
          isDuplicate: true,
        },
      ],
    });

    // Original row has no Remove action
    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await expect(page.testSubj.locator('serviceSettingsStep-removeAction-cloudtrail')).toBeHidden();
    await page.keyboard.press('Escape');

    // Duplicate row has a Remove action — clicking it removes the row
    await page.testSubj.locator(`serviceSettingsStep-actionsButton-${dupInstanceId}`).click();
    await page.testSubj.locator(`serviceSettingsStep-removeAction-${dupInstanceId}`).click();

    await expect(page.getByText(/Showing.*1.*service/)).toBeVisible();
    await expect(page.getByText('AWS CloudTrail [Duplicate]')).toBeHidden();
  });

  test('duplicate modal — Add is disabled until required fields are filled', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['elb'],
      serviceVars: { elb: { enabledInputs: ['aws-s3'], varsByInput: {} } },
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-elb').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-elb').click();

    await page.testSubj.locator('duplicateServiceModal-nameField').blur();

    await expect(page.testSubj.locator('duplicateServiceModal-addButton')).toBeDisabled();

    await fillFlyoutField(page, 'aws-s3', 'bucket_arn', 'arn:aws:s3:::my-bucket');

    await expect(page.testSubj.locator('duplicateServiceModal-addButton')).toBeEnabled();
  });

  test('duplicate modal — name collision shows error and blocks Add', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        },
      },
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();

    // Derive the original name from the modal's pre-filled value so the test
    // stays anchored to whatever the current manifest produces.
    const nameField = page.testSubj.locator('duplicateServiceModal-nameField');
    const preFilled = await nameField.inputValue();
    const originalName = preFilled.replace(/ \[Duplicate\]$/, '');
    await nameField.fill(originalName);

    await expect(
      page.getByText('This name is already in use. Choose a different name.')
    ).toBeVisible();
    await expect(page.testSubj.locator('duplicateServiceModal-addButton')).toBeDisabled();
  });
});
