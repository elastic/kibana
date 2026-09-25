/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  mockAwsPackage,
  useOnboardingFeatureFlag,
  SERVICE_SETTINGS_SESSION_KEY,
  AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
} from '../helpers/onboarding';

// ELB with identity federation enabled (no hide_in_var_group_options).
// bucket_arn is a required text var used to simulate service-var drift.
const MOCK_AWS_PACKAGE = {
  item: {
    version: '7.1.1',
    policy_templates: [
      {
        name: 'elb',
        title: 'AWS ELB',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }],
      },
    ],
    data_streams: [
      {
        path: 'elb_logs',
        type: 'logs',
        streams: [
          {
            input: 'aws-s3',
            vars: [{ name: 'bucket_arn', type: 'text', title: 'Bucket ARN', show_user: true }],
          },
        ],
      },
    ],
  },
};

// SO item returned by GET /cloud_onboarding_deployments/:id.
// serviceVars is empty to exercise the all-defaults deploy path:
// instances were deployed but no vars were ever stored in the SO.
const makeSoItem = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  provider: 'aws',
  connectorId: 'connector-drift-123',
  authMethod: 'identity_federation',
  mechanisms: ['managed_integration'],
  services: ['elb'],
  serviceVars: {},
  policyIdsByInstance: { elb: 'mock-mi-policy-id' },
  status: 'succeeded',
  attemptCount: 1,
  globalRegion: 'us-east-1',
  ...overrides,
});

// Minimal Fleet policy item needed by updateManagedIntegrationsPolicy (GET then PUT).
const MI_POLICY_ITEM = {
  name: 'mock-mi-policy-name',
  namespace: 'default',
  package: { name: 'aws' },
  cloud_connector: null,
};

test.describe('Onboarding drift detection and redeploy', { tag: tags.stateful.classic }, () => {
  useOnboardingFeatureFlag();

  test.beforeEach(async ({ page }) => {
    await mockAwsPackage(page, MOCK_AWS_PACKAGE);
    // Identity federation form needs the connector list to finish loading.
    // Returning an empty list immediately prevents a real fetch from hanging.
    await page.route(
      (url) => /\/api\/fleet\/cloud_connectors/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
    );
  });

  test('service-var drift: callout shown and dirty redeploy fires PUT even when SO serviceVars was empty', async ({
    browserAuth,
    page,
  }) => {
    // SO has serviceVars: {} (user deployed with all defaults, no vars were stored).
    // This exercises the bug where Object.keys({}) = [] meant the drift loop never ran.
    // The fix passes deployedInstanceIds from policyIdsByInstance so the loop also checks
    // session instances whose SO entry is missing.
    const DEP_ID = 'dep-svc-var-drift-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: makeSoItem(DEP_ID) }),
        })
    );

    // Step 1: Navigate with ?deploymentId= to trigger session hydration from SO.
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    // Wait for the page to finish hydrating (the step root must be visible).
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Step 2: Simulate user changing bucket_arn in Step 2 (overwrite session serviceVars).
    // Hydration wrote serviceVars: {} — now we put a non-empty value so the session differs
    // from what the SO recorded.
    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            globalRegion: 'us-east-1',
            serviceVars: {
              elb: {
                enabledDataStreams: ['elb_logs'],
                varsByDataStream: {
                  elb_logs: {
                    enabledInputs: ['aws-s3'],
                    varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::new-drift-bucket' } },
                  },
                },
              },
            },
          })
        );
      },
      { key: SERVICE_SETTINGS_SESSION_KEY }
    );

    // Step 3: Reload — hydration skipped (hydratedDeploymentId guard), drift effect fires.
    // awsServicesMap must load (from mocked package) before drift can complete.
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Drift callout must appear. The drift effect: session elb has bucket_arn, SO has no
    // serviceVars key for elb → deployedInstanceIds includes elb → dirty detected.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

    // The MI section must auto-open (isDone: true → false when isDirty fires).
    // Deploy button must be enabled immediately — connectorId is present so isDeployReady
    // initialises to true without waiting for the identity-federation form to load.
    const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
    await expect(deployButton).toBeEnabled();

    // Mock the MI policy GET/PUT (used by dirty redeploy) and SO PUT (SO write after redeploy).
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(url.pathname),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: MI_POLICY_ITEM }),
        });
      }
    );
    const miPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(new URL(req.url()).pathname)
    );
    const soPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(req.url()).pathname
        )
    );
    await page.route(
      (url) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname) && true,
      async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: makeSoItem(DEP_ID) }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await deployButton.click();

    // Dirty redeploy must PUT the MI policy with updated vars.
    await miPutPromise;
    // After dirty redeploy, SO must be written with the new serviceVars.
    await soPutPromise;

    // isDirty clears → isMiDone becomes true → section collapses, Next button enabled.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
    // Drift callout disappears once isDirty is cleared.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
  });

  test('auth drift: connector change detected and callout shown', async ({ browserAuth, page }) => {
    // SO has connectorId: 'old-connector'. Session will be hydrated with that, then overwritten
    // to 'new-connector' to simulate the user swapping identity in Step 3.
    const DEP_ID = 'dep-auth-drift-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: makeSoItem(DEP_ID, { connectorId: 'old-connector' }),
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Overwrite session to use a different connector than the SO recorded.
    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({ connectorId: 'new-connector', authMethod: 'identity_federation' })
        );
      },
      { key: AUTHENTICATE_AND_DEPLOY_SESSION_KEY }
    );

    // Reload — hydration skipped, drift effect fires. authMethod/connectorId are effect deps
    // so changing connectorId triggers the check.
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Auth drift detected: session connectorId 'new-connector' differs from SO 'old-connector'.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
  });
});
