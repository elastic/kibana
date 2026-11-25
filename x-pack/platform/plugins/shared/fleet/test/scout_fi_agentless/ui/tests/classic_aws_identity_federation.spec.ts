/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaywrightTagsFor, test } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../../../common';
import { ENABLE_IAC_PROVISIONER_FLAG } from '../../../../common/constants';
import {
  mockCloudConnectorsEmpty,
  mockPackagePoliciesEmpty,
} from '../../../scout/ui/fixtures/mocks';

const credentialSelector = 'varGroupSelector-credential_type';
const launchButton = 'awsIdentityFederationSetup-launchCloudFormation';
const saveButton = 'createPackagePolicySaveButton';
const staticTemplate =
  'https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-federated-identity-wii-aws-9.6.0.yml';

async function openAgentlessGuardDuty(page: ScoutPage) {
  await page.gotoApp('integrations/detail/aws/add-integration/guardduty');
  await expect(page.getByTestId(credentialSelector)).toBeVisible();
  const agentless = page.getByRole('radio', { name: /Elastic Managed Integration/ });
  if ((await agentless.count()) && !(await agentless.isChecked())) {
    await agentless.click();
  }
}

async function selectIdentityFederation(page: ScoutPage) {
  await page.getByTestId(credentialSelector).selectOption('identity_federation');
}

test.describe(
  'Classic AWS Identity Federation',
  { tag: getPlaywrightTagsFor('stateful', 'classic', 'local') },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.fleet.integration.installPackage('aws', '8.17.0');
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await mockPackagePoliciesEmpty(page);
      await mockCloudConnectorsEmpty(page);
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: null,
          [ENABLE_IAC_PROVISIONER_FLAG]: null,
        },
      });
    });

    test('hides the option when the release flag is off', async ({ apiServices, page }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: false,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      await openAgentlessGuardDuty(page);

      await expect(
        page.getByTestId(credentialSelector).getByRole('option', { name: 'Identity Federation' })
      ).toHaveCount(0);
    });

    test('uses the static package template in the shared form with the provisioner off', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: false,
        },
      });
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);

      await expect(page.getByRole('tab', { name: 'New Identity' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Existing Identity' })).toBeVisible();
      const launch = page.getByTestId(launchButton);
      await expect(launch).toBeVisible();
      await expect
        .poll(async () => {
          const href = await launch.getAttribute('href');
          const query = href?.split('#')[1]?.split('?')[1];
          return new URLSearchParams(query).get('templateURL');
        })
        .toBe(staticTemplate);
      await expect(page.getByTestId(saveButton)).toBeDisabled();
    });

    test('blocks Save with the provisioner on and restores Save for valid access keys', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);

      await expect(page.getByRole('tab', { name: 'New Identity' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Existing Identity' })).toBeVisible();
      await expect(page.getByTestId(launchButton)).toBeVisible();
      await expect(page.getByTestId(saveButton)).toBeDisabled();

      await page.getByTestId(credentialSelector).selectOption('direct_access_key');
      await page.getByTestId('passwordInput-access-key-id').fill('EXAMPLEACCESSKEY1234');
      await page.getByTestId('passwordInput-secret-access-key').fill('example-secret-access-key');
      await page.getByRole('textbox', { name: 'Detector ID' }).fill('12abc34d567e8fa901bc2d34');
      await page.getByRole('textbox', { name: 'AWS Region' }).fill('us-east-1');
      await expect(page.getByTestId(launchButton)).toHaveCount(0);
      await expect(page.getByTestId(saveButton)).toBeEnabled();
    });

    test('opens manual setup when Kibana cannot receive the callback', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);

      await expect(
        page.getByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).toBeVisible();
      await expect(
        page.getByTestId('awsIdentityFederationSetup-manualEntryToggle')
      ).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByTestId('awsIdentityFederationSetup-roleArn')).toBeVisible();
    });
  }
);
