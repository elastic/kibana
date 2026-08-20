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

// cloudtrail: dual-transport (S3 + CloudWatch); required fields are bucket_arn (S3) / log_group_arn (CW)
// waf: static ECF deployment method → always showInUI:true regardless of manifest version
// s3access: managed_integration, showInUI:true, no required text vars → used for no-attention-callout test

const SERVICES_STEP_SESSION_KEY = 'onboarding.aws.servicesStep';
const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

async function navigateToServiceSettings(
  browserAuth: BrowserAuthFixture,
  page: ScoutPage,
  opts: {
    selectedServiceIds: string[];
    globalRegion?: string;
    serviceVars?: Record<string, unknown>;
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
      vars: Record<string, unknown>;
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
      selectedServiceIds: ['ec2_metrics', 'cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Metrics').click();
    await expect(
      page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeHidden();

    await page.testSubj.locator('serviceSettingsStep-signalFilter').getByText('Logs').click();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_metrics')).toBeHidden();
  });

  test('global region shown in Region column; per-service override takes precedence', async ({
    browserAuth,
    page,
  }) => {
    // waf has static ECF deployment method → always showInUI:true regardless of manifest
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['waf', 'cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: { region: 'eu-west-1' } } },
    });

    // waf has no override — shows global region.
    // Locate by service-link test-subj (not by row name) since the manifest-derived
    // display name may differ across package versions (e.g. 'waf' vs 'AWS WAF logs').
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

  // TODO: bucket_arn is optional (not required) in the aws-7.1.1 manifest, so no service
  // currently has required text vars that trigger the attention callout. Re-enable once a
  // service with required text configuration is promoted to the onboarding matrix.
  test.skip('attention callout and badge shown when required flyout fields are empty', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(
      page.testSubj.locator('serviceSettingsStep-attentionIcon-cloudtrail')
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();
  });

  test('service with no required text vars shows no attention badge and does not block Continue', async ({
    browserAuth,
    page,
  }) => {
    // s3access: showInUI:true, managed_integration; no required text vars in the manifest
    // so no incomplete instance → no attention callout → Continue enabled.
    // (firewall_metrics was previously used here but has showInUI:false, which the context
    // filters out of selectedServiceIds — making the step unreachable.)
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['s3access'],
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-s3access')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  test('expand icon opens flyout for the correct service', async ({ browserAuth, page }) => {
    // cloudtrail has configurable flyout fields (transport toggle + bucket_arn),
    // so it shows an edit button. ec2_metrics has no configurable fields after
    // removing the region selector and shows plain text instead.
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await expect(page.getByRole('heading', { name: /AWS CloudTrail/ })).toBeVisible();

    await page.testSubj.locator('serviceSettingsFlyout-closeButton').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeHidden();
  });

  test('service name link also opens flyout', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-serviceLink-cloudtrail').click();
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

  test('flyout no longer shows AWS Region override field', async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
    });

    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();

    await expect(page.getByLabel('AWS Region (override)')).toBeHidden();
  });

  // TODO: bucket_arn is optional in aws-7.1.1 — no attention callout appears when it is empty.
  // Re-enable once a service with required text vars is available.
  test.skip('filling required field in flyout and saving unblocks Continue', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .locator('input')
      .fill('arn:aws:s3:::my-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

    await expect(
      page.testSubj.locator('serviceSettingsStep-attentionIcon-cloudtrail')
    ).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeHidden();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
  });

  // ── Duplicate service ───────────────────────────────────────────────────

  test('⋮ actions menu is visible on every row and contains Duplicate service', async ({
    browserAuth,
    page,
  }) => {
    // waf has static ECF → always showInUI:true regardless of manifest
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

    // Regex: manifest title varies by package version ('AWS CloudTrail' vs 'AWS CloudTrail Logs').
    await expect(page.testSubj.locator('duplicateServiceModal-nameField')).toHaveValue(
      /AWS CloudTrail.*\[Duplicate\]/
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
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: 'arn:aws:s3:::original-bucket' } },
      },
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();

    // Fill the duplicate bucket_arn and click Add
    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .locator('input')
      .fill('arn:aws:s3:::second-bucket');
    await page.testSubj.locator('duplicateServiceModal-addButton').click();

    await expect(page.testSubj.locator('duplicateServiceModal')).toBeHidden();

    // Table now shows 2 rows
    await expect(page.getByText(/Showing.*2.*services/)).toBeVisible();
    // The new row uses the generated name (title varies by package version).
    await expect(page.getByText(/AWS CloudTrail.*\[Duplicate\]/)).toBeVisible();
  });

  test("duplicate row's config is independent from the original", async ({ browserAuth, page }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: 'arn:aws:s3:::original-bucket' } },
      },
    });

    // Duplicate with a different bucket_arn
    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();
    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .locator('input')
      .fill('arn:aws:s3:::second-bucket');
    await page.testSubj.locator('duplicateServiceModal-addButton').click();

    // Open the original's flyout and verify its bucket_arn is unchanged
    await page.testSubj.locator('serviceSettingsStep-editButton-cloudtrail').click();
    await expect(
      page.testSubj.locator('serviceSettingsFlyout-field-bucket_arn').locator('input')
    ).toHaveValue('arn:aws:s3:::original-bucket');
    await page.testSubj.locator('serviceSettingsFlyout-closeButton').click();
  });

  // TODO: bucket_arn is optional in aws-7.1.1 — attention badge never fires for empty bucket_arn.
  // Re-enable once a service with required text vars is available.
  test.skip('duplicate row participates in attention callout and Continue readiness', async ({
    browserAuth,
    page,
  }) => {
    const dupInstanceId = 'cloudtrail__dup-1';
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        [dupInstanceId]: { trigger: 'aws-s3', vars: {} }, // bucket_arn missing
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

    await expect(
      page.testSubj.locator(`serviceSettingsStep-attentionIcon-${dupInstanceId}`)
    ).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-attentionCallout')).toBeVisible();
    await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

    await page.testSubj.locator(`serviceSettingsStep-editButton-${dupInstanceId}`).click();
    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .locator('input')
      .fill('arn:aws:s3:::second-bucket');
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
        cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: 'arn:aws:s3:::original-bucket' } },
        [dupInstanceId]: {
          trigger: 'aws-s3',
          vars: { bucket_arn: 'arn:aws:s3:::second-bucket' },
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

  // TODO: bucket_arn is optional in aws-7.1.1 — Add button is always enabled regardless of
  // bucket_arn being empty. Re-enable once a service with required text vars is available.
  test.skip('duplicate modal — Add is disabled until required fields are filled', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: { cloudtrail: { trigger: 'aws-s3', vars: {} } },
    });

    await page.testSubj.locator('serviceSettingsStep-actionsButton-cloudtrail').click();
    await page.testSubj.locator('serviceSettingsStep-duplicateAction-cloudtrail').click();

    await page.testSubj.locator('duplicateServiceModal-nameField').blur();

    await expect(page.testSubj.locator('duplicateServiceModal-addButton')).toBeDisabled();

    await page.testSubj
      .locator('serviceSettingsFlyout-field-bucket_arn')
      .locator('input')
      .fill('arn:aws:s3:::my-bucket');

    await expect(page.testSubj.locator('duplicateServiceModal-addButton')).toBeEnabled();
  });

  test('duplicate modal — name collision shows error and blocks Add', async ({
    browserAuth,
    page,
  }) => {
    await navigateToServiceSettings(browserAuth, page, {
      selectedServiceIds: ['cloudtrail'],
      serviceVars: {
        cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: 'arn:aws:s3:::original-bucket' } },
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
