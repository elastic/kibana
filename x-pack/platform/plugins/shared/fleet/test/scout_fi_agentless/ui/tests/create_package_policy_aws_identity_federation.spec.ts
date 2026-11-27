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

const roleArn = 'arn:aws:iam::123456789012:role/ElasticFederatedIdentity';
const stackArn =
  'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-federated-identity/1a2b3c4d';
const guardDutyIntegrations = [
  { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
];
const identitiesRoute = /\/api\/fleet\/cloud_connectors(\?.*)?$/;
const identityRoute = /\/api\/fleet\/cloud_connectors\/[^/?]+(\?.*)?$/;
const verifyIacKeyRoute = '**/internal/fleet/cloud_connectors/*/verify_iac_key';
const callbacksRoute = /\/internal\/fleet\/iac_provisioner\/callbacks(\/[^/?]+)?(\?.*)?$/;
// The page creates agentless policies through the managed integrations API.
const agentlessPoliciesRoute = /\/api\/fleet\/managed_integrations(\?.*)?$/;
// The confirmation modal only shows for some setups; give it a moment before saving without it.
const OPTIONAL_CONFIRM_TIMEOUT_MS = 5_000;
// The page polls the callback record every 3 seconds; three stages fit well inside this.
const CALLBACK_STAGES_TIMEOUT_MS = 20_000;

const storedIdentity = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  cloudProvider: 'aws',
  accountType: 'single-account',
  vars: { role_arn: { type: 'text', value: roleArn } },
  packagePolicyCount: 0,
  created_at: '2026-11-26T10:00:00.000Z',
  updated_at: '2026-11-26T10:00:00.000Z',
  ...extra,
});

/** Identities the page lists and creates, kept in the browser for this page only. */
async function mockIdentityStore(page: ScoutPage, initial: Array<Record<string, unknown>> = []) {
  const identities = [...initial];
  const created: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; body: Record<string, unknown> }> = [];
  await page.route(identitiesRoute, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        json: { items: identities, total: identities.length, page: 1, perPage: 100 },
      });
      return;
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      created.push(body);
      const item = storedIdentity('connector-manual', String(body.name ?? 'Manual identity'));
      identities.push(item);
      await route.fulfill({ json: { item } });
      return;
    }
    await route.continue();
  });
  await page.route(identityRoute, async (route, request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    if (request.method() === 'PUT') {
      updates.push({ id, body: request.postDataJSON() as Record<string, unknown> });
      await route.fulfill({ json: { item: identities.find((i) => i.id === id) ?? { id } } });
      return;
    }
    if (request.method() === 'GET') {
      await route.fulfill({ json: { item: identities.find((i) => i.id === id) ?? { id } } });
      return;
    }
    await route.continue();
  });
  return { identities, created, updates };
}

/** Captures the agentless policy the page saves and answers as the server would. */
async function captureAgentlessPolicySave(page: ScoutPage) {
  const saved: Array<Record<string, any>> = [];
  await page.route(agentlessPoliciesRoute, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = request.postDataJSON() as Record<string, any>;
    saved.push(body);
    await route.fulfill({
      json: {
        item: {
          id: 'agentless-policy-1',
          name: body.name,
          namespace: 'default',
          package: body.package,
          cloud_connector: { cloud_connector_id: body.cloud_connector?.cloud_connector_id },
        },
      },
    });
  });
  return saved;
}

async function mockCallbackAvailable(page: ScoutPage) {
  await page.route(callbackAvailabilityRoute, (route) =>
    route.fulfill({ json: { available: true, kibana_url: 'https://kibana.example.com' } })
  );
}

async function mockRenderedTemplate(page: ScoutPage) {
  await page.route(renderTemplateRoute, (route) =>
    route.fulfill({
      json: {
        render: true,
        templateSha: 'sha256:test-template',
        artifactUrl: renderedTemplateUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        blueprint: { id: 'aws/workload_identity_federation', version: '1.4.0' },
      },
    })
  );
}

async function stubAwsConsole(page: ScoutPage) {
  await page
    .context()
    .route(awsConsole, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html><body>AWS console</body></html>' })
    );
}

async function fillGuardDutyFields(page: ScoutPage) {
  await page.getByRole('textbox', { name: 'Detector ID' }).fill('12abc34d567e8fa901bc2d34');
  await page.getByRole('textbox', { name: 'AWS Region' }).fill('us-east-1');
}

async function saveAndCapture(page: ScoutPage, saved: Array<Record<string, any>>) {
  await page.getByTestId(saveButton).click();
  const confirm = page.getByTestId('confirmModalConfirmButton');
  if (
    await confirm
      .waitFor({ state: 'visible', timeout: OPTIONAL_CONFIRM_TIMEOUT_MS })
      .then(() => true)
      .catch(() => false)
  ) {
    await confirm.click();
  }
  await expect.poll(() => saved.length).toBe(1);
  return saved[0];
}

/** The saved policy carries the identity and its role ARN, and never an external ID (#284522). */
function expectIdentityOnSavedPolicy(saved: Record<string, any>, connectorId: string) {
  expect(saved.cloud_connector).toMatchObject({ enabled: true, cloud_connector_id: connectorId });
  expect(JSON.stringify(saved.vars)).toContain(roleArn);
  expect(JSON.stringify(saved)).not.toContain('external_id');
}

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

    test('creates an identity manually, then saves the policy with it', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: false,
        },
      });
      const store = await mockIdentityStore(page);
      const saved = await captureAgentlessPolicySave(page);
      await page.route(callbackAvailabilityRoute, (route) =>
        route.fulfill({
          json: {
            available: false,
            reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
          },
        })
      );
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);
      await fillGuardDutyFields(page);
      await expect(page.getByTestId(saveButton)).toBeDisabled();

      await page.getByTestId('awsIdentityFederationSetup-connectorName').fill('Manual identity');
      await page.getByTestId('awsIdentityFederationSetup-roleArn').fill(roleArn);
      await page.getByTestId('awsIdentityFederationSetup-stackArn').fill(stackArn);
      await page.getByTestId('awsIdentityFederationSetup-createButton').click();

      await expect.poll(() => store.created.length).toBe(1);
      await expect(page.getByTestId(saveButton)).toBeEnabled();
      expectIdentityOnSavedPolicy(await saveAndCapture(page, saved), 'connector-manual');
    });

    test('creates an identity through the CloudFormation callback, then saves the policy with it', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      const store = await mockIdentityStore(page);
      const saved = await captureAgentlessPolicySave(page);
      await mockCallbackAvailable(page);
      await mockRenderedTemplate(page);
      await stubAwsConsole(page);
      // The stack reports in three stages the page polls for: launched, reporting, identity created.
      const stages = ['pending', 'receiving', 'received'] as const;
      let polls = 0;
      await page.route(callbacksRoute, async (route, request) => {
        const base = {
          id: 'callback-1',
          provider: 'aws',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          connector_name: 'Callback identity',
        };
        if (request.method() === 'POST') {
          await route.fulfill({
            json: { item: { ...base, status: 'pending' }, token: 'test-token' },
          });
          return;
        }
        if (request.method() === 'GET') {
          const status = stages[Math.min(polls++, stages.length - 1)];
          if (status === 'received' && !store.identities.some((i) => i.id === 'connector-cb')) {
            store.identities.push(
              storedIdentity('connector-cb', 'Callback identity', { iac_deployment_id: stackArn })
            );
          }
          await route.fulfill({
            json: {
              item: {
                ...base,
                status,
                ...(status === 'received' && {
                  cloud_connector_id: 'connector-cb',
                  role_arn: roleArn,
                  stack_arn: stackArn,
                  received_at: new Date().toISOString(),
                }),
              },
            },
          });
          return;
        }
        await route.fulfill({ json: {} });
      });
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);
      await fillGuardDutyFields(page);
      await page.getByTestId('awsIdentityFederationSetup-connectorName').fill('Callback identity');

      const popupPromise = page.waitForEvent('popup');
      await page.getByTestId(launchButton).click();
      const popup = await popupPromise;
      await popup.waitForURL(awsConsole);
      const fragmentQuery = new URL(popup.url()).hash.split('?')[1];
      expect(new URLSearchParams(fragmentQuery).getAll('templateURL')).toStrictEqual([
        renderedTemplateUrl,
      ]);

      const pending = page.getByTestId('awsIdentityFederationSetup-callbackPending');
      await expect(pending).toContainText('Creating stack', {
        timeout: CALLBACK_STAGES_TIMEOUT_MS,
      });
      await expect(pending).toContainText('Creating identity', {
        timeout: CALLBACK_STAGES_TIMEOUT_MS,
      });
      await expect(page.getByTestId(saveButton)).toBeEnabled({
        timeout: CALLBACK_STAGES_TIMEOUT_MS,
      });
      expectIdentityOnSavedPolicy(await saveAndCapture(page, saved), 'connector-cb');
    });

    test('saves with an existing identity whose template covers the enabled inputs', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      await mockIdentityStore(page, [
        storedIdentity('connector-1', 'First', {
          iac_deployment_id: stackArn,
          iac_key: 'sha256:current-template',
        }),
      ]);
      const saved = await captureAgentlessPolicySave(page);
      await mockCallbackAvailable(page);
      await page.route(verifyIacKeyRoute, (route) =>
        route.fulfill({
          json: {
            matches: true,
            outcome: 'matches',
            deploymentId: stackArn,
            region: 'us-east-1',
            integrations: guardDutyIntegrations,
          },
        })
      );
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);
      await fillGuardDutyFields(page);

      await page.getByRole('tab', { name: 'Existing Identity' }).click();
      await page.getByTestId('aws-cloud-connector-super-select').click();
      await page.getByRole('option', { name: /First/ }).click();

      await expect(page.getByTestId('cloudConnectorIacCheckCallout')).toHaveCount(0);
      await expect(page.getByTestId(saveButton)).toBeEnabled();
      expectIdentityOnSavedPolicy(await saveAndCapture(page, saved), 'connector-1');
    });

    test('holds Save for an existing identity that needs a stack update, then saves and records the template', async ({
      apiServices,
      page,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [AWS_IDENTITY_FEDERATION_ENABLED_FLAG]: true,
          [ENABLE_IAC_PROVISIONER_FLAG]: true,
        },
      });
      const store = await mockIdentityStore(page, [
        storedIdentity('connector-1', 'First', {
          iac_deployment_id: stackArn,
          iac_key: 'sha256:old-template',
        }),
      ]);
      const saved = await captureAgentlessPolicySave(page);
      await mockCallbackAvailable(page);
      await mockRenderedTemplate(page);
      await stubAwsConsole(page);
      await page.route(verifyIacKeyRoute, (route) =>
        route.fulfill({
          json: {
            matches: false,
            reason: 'key_mismatch',
            outcome: 'key_mismatch',
            deploymentId: stackArn,
            region: 'us-east-1',
            integrations: guardDutyIntegrations,
          },
        })
      );
      await openAgentlessGuardDuty(page);
      await selectIdentityFederation(page);
      await fillGuardDutyFields(page);
      await page.getByRole('tab', { name: 'Existing Identity' }).click();
      await page.getByTestId('aws-cloud-connector-super-select').click();
      await page.getByRole('option', { name: /First/ }).click();

      await expect(page.getByTestId('cloudConnectorIacCheckCallout')).toBeVisible();
      await expect(page.getByTestId(saveButton)).toBeDisabled();

      const popupPromise = page.waitForEvent('popup');
      await page.getByTestId('cloudConnectorIacCheckUpdateStackButton').click();
      const popup = await popupPromise;
      await popup.waitForURL(awsConsole);
      expect(popup.url()).toContain('stacks/update');
      await expect(page.getByTestId(saveButton)).toBeEnabled();
      // Launching the update does not touch the identity; only a saved policy records the template.
      expect(store.updates).toHaveLength(0);

      expectIdentityOnSavedPolicy(await saveAndCapture(page, saved), 'connector-1');
      await expect
        .poll(() => store.updates)
        .toStrictEqual([
          {
            id: 'connector-1',
            body: expect.objectContaining({ iac_key: 'sha256:test-template' }),
          },
        ]);
    });
  }
);
