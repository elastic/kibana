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
const packageInfoRoute = /\/api\/fleet\/epm\/packages\/aws(\/[^/?]+)?(\?.*)?$/;
const awsConsole = /console\.aws\.amazon\.com/;
const callbackAvailabilityRoute = '**/internal/fleet/iac_provisioner/callback_availability';
const renderTemplateRoute = '**/internal/fleet/iac_provisioner/render_template';
const renderedTemplateUrl =
  'https://rendered-templates.example.com/identity-federation.yml?sig=test';
const staticTemplate =
  'https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-federated-identity-wii-aws-9.6.0.yml';
// What newer package versions declare as the option's `iac_template_url`: a console quick-create
// link that carries the template.
const staticQuickCreateUrl = `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=${encodeURIComponent(
  staticTemplate
)}`;

async function openAgentlessGuardDuty(page: ScoutPage) {
  await page.gotoApp('integrations/detail/aws/add-integration/guardduty');
  await expect(page.getByTestId(credentialSelector)).toBeVisible();
  const agentless = page.getByRole('radio', { name: /Elastic Managed Integration/ });
  if ((await agentless.count()) && !(await agentless.isChecked())) {
    await agentless.click();
  }
}

/**
 * Gives the Identity Federation option of the installed `aws` package the static template URL of
 * newer package versions, for this page only, so the shared server install is left untouched.
 */
async function mockStaticTemplateOnIdentityFederationOption(page: ScoutPage) {
  await page.route(packageInfoRoute, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    for (const group of body.item?.var_groups ?? []) {
      for (const option of group.options ?? []) {
        if (option.name === 'identity_federation') {
          option.iac_template_url = staticQuickCreateUrl;
        }
      }
    }
    await route.fulfill({ response, json: body });
  });
}

async function selectIdentityFederation(page: ScoutPage) {
  await page.getByTestId(credentialSelector).selectOption('identity_federation');
}

test.describe(
  'AWS Identity Federation on the create package policy page',
  { tag: getPlaywrightTagsFor('stateful', 'classic', 'local') },
  () => {
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
      await mockStaticTemplateOnIdentityFederationOption(page);
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
      const renderRequests: Array<{ integrations?: unknown }> = [];
      await page.route(renderTemplateRoute, async (route) => {
        renderRequests.push(route.request().postDataJSON());
        await route.fulfill({
          json: {
            render: true,
            templateSha: 'sha256:test-template',
            artifactUrl: renderedTemplateUrl,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            blueprint: { id: 'aws-federated-identity', version: '1.0.0' },
          },
        });
      });
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);

      await expect(page.getByRole('tab', { name: 'New Identity' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Existing Identity' })).toBeVisible();
      await expect(page.getByTestId(launchButton)).toBeVisible();
      await expect(page.getByTestId(saveButton)).toBeDisabled();

      // Launch opens the AWS console in a new tab: answer that navigation here, never reach AWS.
      await page
        .context()
        .route(awsConsole, (route) =>
          route.fulfill({ contentType: 'text/html', body: '<html><body>AWS console</body></html>' })
        );
      const popupPromise = page.waitForEvent('popup');
      await page.getByTestId(launchButton).click();
      const popup = await popupPromise;
      await popup.waitForURL(awsConsole);
      const fragmentQuery = new URL(popup.url()).hash.split('?')[1];
      expect(new URLSearchParams(fragmentQuery).getAll('templateURL')).toStrictEqual([
        renderedTemplateUrl,
      ]);
      await expect.poll(() => renderRequests.length).toBeGreaterThan(0);
      expect(renderRequests[0].integrations).toStrictEqual([
        { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
      ]);

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
      // The availability answer depends on the scheme of the server's public URL, which differs
      // between local and CI servers, so the route is answered here.
      const reason = 'Kibana has no public URL: server.publicBaseUrl is not set.';
      await page.route(callbackAvailabilityRoute, (route) =>
        route.fulfill({ json: { available: false, reason } })
      );
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);

      await expect(
        page.getByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).toBeVisible();
      await expect(
        page.getByTestId('awsIdentityFederationSetup-callbackUnavailableReason')
      ).toContainText(reason);
      await expect(
        page.getByTestId('awsIdentityFederationSetup-manualEntryToggle')
      ).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByTestId('awsIdentityFederationSetup-roleArn')).toBeVisible();
    });
  }
);
