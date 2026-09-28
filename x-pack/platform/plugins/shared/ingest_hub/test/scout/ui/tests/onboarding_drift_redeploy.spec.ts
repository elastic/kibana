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
  DETECT_AND_REVIEW_SESSION_KEY,
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
          body: JSON.stringify({
            item: makeSoItem(DEP_ID, { connectorId: null, authMethod: 'static_keys' }),
          }),
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

    await page.evaluate(
      ({ key, depId }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            policyIdsByInstance: { elb: 'mock-mi-policy-id' },
            serviceStatuses: { elb: 'receiving' },
            onboardingDeploymentId: depId,
            failedInstances: [],
            deployErrors: {},
          })
        );
      },
      { key: DETECT_AND_REVIEW_SESSION_KEY, depId: DEP_ID }
    );

    // Step 2: Simulate user changing bucket_arn in Step 2 (overwrite session serviceVars).
    // Hydration wrote serviceVars: {} — now we put a non-empty value so the session differs
    // from what the SO recorded.
    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            globalRegion: 'us-east-1',
            instances: [
              { instanceId: 'elb', serviceId: 'elb', name: 'AWS ELB', isDuplicate: false },
            ],
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

    // isAlreadyDeployed would be true based on statuses but isDirty blocks Next.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

    // The MI section must auto-open (isDone: true → false when isDirty fires).
    // The deployment used static keys (no connectorId), so StaticKeysReplaceView is shown.
    // Fill in both credential fields so isDeployReady becomes true and Deploy enables.
    await page.testSubj.click('staticKeysReplace-accessKeyId-toggle');
    await page.testSubj.fill('staticKeysReplace-accessKeyId', 'AKIAIOSFODNN7EXAMPLE');
    await page.testSubj.click('staticKeysReplace-secretAccessKey-toggle');
    await page.testSubj.fill(
      'staticKeysReplace-secretAccessKey',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    );
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

    // Dirty redeploy must PUT the MI policy — body must carry the changed bucket_arn value.
    const miPutRequest = await miPutPromise;
    expect(miPutRequest.postData()).toContain('new-drift-bucket');
    // After dirty redeploy, SO must be written with the new serviceVars.
    const soRequest = await soPutPromise;
    expect(JSON.stringify(JSON.parse(soRequest.postData() ?? '{}'))).toContain('new-drift-bucket');

    // isDirty clears → isMiDone becomes true → section collapses, Next button enabled.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
    // Drift callout disappears once isDirty is cleared.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
  });

  test('no drift on clean return: no callout shown, Next enabled', async ({
    browserAuth,
    page,
  }) => {
    // SO and session match — user returned to Step 3 without changing any settings.
    const DEP_ID = 'dep-no-drift-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: makeSoItem(DEP_ID) }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Hydration wrote session from SO. Inject serviceStatuses so isAlreadyDeployed becomes true
    // (the SO does not store serviceStatuses — those come from the Detect & Review step).
    await page.evaluate(
      ({ key, depId }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            policyIdsByInstance: { elb: 'mock-mi-policy-id' },
            serviceStatuses: { elb: 'receiving' },
            onboardingDeploymentId: depId,
          })
        );
      },
      { key: DETECT_AND_REVIEW_SESSION_KEY, depId: DEP_ID }
    );

    // Await the drift effect's SO re-fetch so state settles before asserting.
    const soResponsePromise = page.waitForResponse(
      (resp) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(resp.url()).pathname
        ) && resp.status() === 200
    );
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    await soResponsePromise;

    // No drift: session matches SO → callout must not appear.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
    // isAlreadyDeployed && !isDirty → isMiDone → Next enabled immediately.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
  });

  test('removing a deployed service does not trigger false drift', async ({
    browserAuth,
    page,
  }) => {
    // Both ELB and EC2 appear in policyIdsByInstance (they were deployed), but the user
    // deselected EC2 in Step 1 so session serviceVars has no EC2 entry.
    // EC2 is a cleanup target — the drift loop must skip it, not flag it as changed.
    const DEP_ID = 'dep-remove-svc-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: makeSoItem(DEP_ID, {
              policyIdsByInstance: { elb: 'mock-mi-elb-policy', ec2: 'mock-ec2-policy' },
              // EC2 has SO serviceVars so the drift loop actually visits it — exercises the
              // `if (!typedSession[instanceId]) continue` guard that skips removed instances.
              serviceVars: { ec2: { enabledDataStreams: ['ec2_logs'] } },
            }),
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    const soResponsePromise = page.waitForResponse(
      (resp) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(resp.url()).pathname
        ) && resp.status() === 200
    );
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    await soResponsePromise;

    // EC2 in deployedInstanceIds but absent from session serviceVars — drift loop skips it.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
  });

  test('static-key replacement marks dirty immediately without SO re-fetch', async ({
    browserAuth,
    page,
  }) => {
    // SO uses static_keys auth — isStaticKeysEditMode renders the replace-keys form.
    const DEP_ID = 'dep-static-dirty-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: makeSoItem(DEP_ID, { authMethod: 'static_keys', connectorId: null }),
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Await the drift effect's SO fetch before filling the form to prevent the effect's
    // updateDetectAndReviewStep({ isDirty: false }) from racing with the form's isDirty: true.
    const soResponsePromise = page.waitForResponse(
      (resp) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(resp.url()).pathname
        ) && resp.status() === 200
    );
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    await soResponsePromise;

    // Override the package mock to include credential vars at the package level
    // so the policy PUT body carries the new key values.
    await mockAwsPackage(page, {
      item: {
        ...MOCK_AWS_PACKAGE.item,
        vars: [
          { name: 'access_key_id', type: 'text' },
          { name: 'secret_access_key', type: 'password' },
        ],
      },
    });

    // Reveal and fill both credential fields; once both are non-empty the replace view calls
    // onReadyChange(true) which synchronously sets isDirty=true — no SO fetch needed.
    await page.testSubj.locator('staticKeysReplace-accessKeyId-toggle').click();
    await page.testSubj.locator('staticKeysReplace-accessKeyId').fill('AKIAIOSFODNN7EXAMPLE');
    await page.testSubj.locator('staticKeysReplace-secretAccessKey-toggle').click();
    await page.testSubj.locator('staticKeysReplace-secretAccessKey').fill('wJalrXUtnFEMI/K7MDENG');

    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

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
            body: JSON.stringify({
              item: makeSoItem(DEP_ID, { authMethod: 'static_keys', connectorId: null }),
            }),
          });
        } else {
          await route.continue();
        }
      }
    );

    const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
    await expect(deployButton).toBeEnabled();
    await deployButton.click();

    const miPutRequest = await miPutPromise;
    const miPutBody = JSON.parse(miPutRequest.postData() ?? '{}');
    // Credential vars must be included in the PUT body.
    expect(JSON.stringify(miPutBody)).toContain('AKIAIOSFODNN7EXAMPLE');
    await soPutPromise;

    // isDirty clears → drift callout disappears.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
  });

  test('failed dirty redeploy keeps Retry visible and blocks Next', async ({
    browserAuth,
    page,
  }) => {
    // Same service-var drift setup as the first test, but the Fleet PUT returns 500.
    const DEP_ID = 'dep-fail-redeploy-001';
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: makeSoItem(DEP_ID, { connectorId: null, authMethod: 'static_keys' }),
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            globalRegion: 'us-east-1',
            instances: [
              { instanceId: 'elb', serviceId: 'elb', name: 'AWS ELB', isDuplicate: false },
            ],
            serviceVars: {
              elb: {
                enabledDataStreams: ['elb_logs'],
                varsByDataStream: {
                  elb_logs: {
                    enabledInputs: ['aws-s3'],
                    varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::fail-test-bucket' } },
                  },
                },
              },
            },
          })
        );
      },
      { key: SERVICE_SETTINGS_SESSION_KEY }
    );

    // Seed detectAndReview so the MI section renders in deployed state (serviceStatuses keeps
    // the instance visible and isAlreadyDeployed=true so isDirty blocks Next - 4123190774).
    await page.evaluate(
      ({ key, depId }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            policyIdsByInstance: { elb: 'mock-mi-policy-id' },
            serviceStatuses: { elb: 'receiving' },
            onboardingDeploymentId: depId,
            failedInstances: [],
            deployErrors: {},
          })
        );
      },
      { key: DETECT_AND_REVIEW_SESSION_KEY, depId: DEP_ID }
    );

    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

    await page.testSubj.click('staticKeysReplace-accessKeyId-toggle');
    await page.testSubj.fill('staticKeysReplace-accessKeyId', 'AKIAIOSFODNN7EXAMPLE');
    await page.testSubj.click('staticKeysReplace-secretAccessKey-toggle');
    await page.testSubj.fill(
      'staticKeysReplace-secretAccessKey',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    );

    // Policy GET succeeds, PUT returns 500 — simulates a transient Fleet error.
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(url.pathname),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: MI_POLICY_ITEM }),
          });
        } else if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'simulated policy update failure' }),
          });
        } else {
          await route.continue();
        }
      }
    );

    const miPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(new URL(req.url()).pathname)
    );

    await page.testSubj.locator('managedIntegrationsSection-deployButton').click();
    await miPutPromise;

    // Failed PUT: hook surfaces hasFailed=true, isDeploying becomes false.
    await expect(page.testSubj.locator('managedIntegrationsSection-retryButton')).toBeVisible();
    // isDirty remains true — a failed deploy does not clear it.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
    // isMiDone is false — Next stays blocked until a successful redeploy.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

    // Exercise successful Retry: override the PUT mock to return 200, then add SO PUT mock
    // and click Retry — the drift callout must disappear and Next must enable (4123049397).
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(url.pathname),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: MI_POLICY_ITEM }),
          });
        } else if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: MI_POLICY_ITEM }),
          });
        } else {
          await route.continue();
        }
      }
    );
    await page.route(
      (url) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname) && true,
      async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              item: makeSoItem(DEP_ID, { connectorId: null, authMethod: 'static_keys' }),
            }),
          });
        } else {
          await route.continue();
        }
      }
    );
    const retryMiPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/managed_integrations\/mock-mi-policy-id$/.test(new URL(req.url()).pathname)
    );
    await page.testSubj.locator('managedIntegrationsSection-retryButton').click();
    await retryMiPutPromise;
    // Successful retry: drift flag cleared, callout disappears, Next enables.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
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

  test('agent-based dirty redeploy: service-var drift triggers package policy PUT and SO update', async ({
    browserAuth,
    page,
  }) => {
    // Previously deployed via agent-based existing-policy mode. SO serviceVars is empty
    // (all-defaults deploy). User changed bucket_arn in Step 2 — session now differs from SO.
    const DEP_ID = 'dep-ab-drift-001';
    const AB_PKG_POLICY_ID = 'mock-ab-pkg-policy-id';

    // SO GET: agent-based deployment, empty serviceVars, assume_role auth.
    await page.route(
      (url) => new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: {
              id: DEP_ID,
              provider: 'aws',
              connectorId: null,
              authMethod: 'assume_role',
              mechanisms: ['agent_based'],
              services: ['elb'],
              serviceVars: {},
              policyIdsByInstance: { elb: AB_PKG_POLICY_ID },
              agentPolicyIds: ['mock-agent-policy-id'],
              status: 'succeeded',
              attemptCount: 1,
              globalRegion: 'us-east-1',
            },
          }),
        })
    );

    // Agent policies combobox — return the seeded policy so the combobox is not empty and
    // selectedAgentPolicyIds is preserved (an empty list causes reconcile to clear it - 4123330443).
    await page.route(
      (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{ id: 'mock-agent-policy-id', name: 'Mock Agent Policy' }],
            total: 1,
            page: 1,
            perPage: 20,
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: DEP_ID },
      hash: 'authenticate-and-deploy',
    });
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

    // Seed detectAndReview: policyIdsByInstance makes isAlreadyDeployed=true.
    await page.evaluate(
      ({ key, depId }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            policyIdsByInstance: { elb: 'mock-ab-pkg-policy-id' },
            serviceStatuses: { elb: 'receiving' },
            onboardingDeploymentId: depId,
            failedInstances: [],
            deployErrors: {},
          })
        );
      },
      { key: DETECT_AND_REVIEW_SESSION_KEY, depId: DEP_ID }
    );

    // Simulate changing bucket_arn in Step 2 — session serviceVars now has a new value.
    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            globalRegion: 'us-east-1',
            instances: [
              { instanceId: 'elb', serviceId: 'elb', name: 'AWS ELB', isDuplicate: false },
            ],
            serviceVars: {
              elb: {
                enabledDataStreams: ['elb_logs'],
                varsByDataStream: {
                  elb_logs: {
                    enabledInputs: ['aws-s3'],
                    varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::agent-drift-bucket' } },
                  },
                },
              },
            },
          })
        );
      },
      { key: SERVICE_SETTINGS_SESSION_KEY }
    );

    // Set auth step to agent-based existing-policy mode with assume_role credentials.
    await page.evaluate(
      ({ key }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            deploymentMethod: 'agent_based',
            agentHostsMode: 'existing',
            selectedAgentPolicyIds: ['mock-agent-policy-id'],
            agentCredentialMethod: 'assume_role',
            // authMethod kept in sync with agentCredentialMethod so the drift check
            // compares the correct value against the SO's stored authMethod.
            authMethod: 'assume_role',
          })
        );
      },
      { key: AUTHENTICATE_AND_DEPLOY_SESSION_KEY }
    );

    // Reload — drift effect fires, fetches SO to compare against session.
    const soGetPromise = page.waitForResponse(
      (resp) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(resp.url()).pathname
        ) && resp.status() === 200
    );
    await page.reload();
    await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    await soGetPromise;

    // Drift detected: session has bucket_arn, SO has no serviceVars for elb → isDirty=true.
    await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
    // Next disabled: isAgentDone=false (isDirty) and credentials not yet entered.
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

    // Enter roleArn → isCredentialReady=true → isNextReady=true → Next enables.
    await page.testSubj
      .locator('agentBasedSection-roleArn')
      .fill('arn:aws:iam::123456789012:role/MyRole');
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();

    // Mock Fleet package policy GET+PUT used by updateAgentBasedPolicy.
    await page.route(
      (url) => new RegExp(`/api/fleet/package_policies/${AB_PKG_POLICY_ID}$`).test(url.pathname),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              item: {
                name: 'mock-ab-pkg-policy-name',
                namespace: 'default',
                package: { name: 'aws', version: '7.1.1' },
                policy_ids: ['mock-agent-policy-id'],
                vars: {},
              },
            }),
          });
        } else if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: { id: AB_PKG_POLICY_ID } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    const pkgPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        new RegExp(`/api/fleet/package_policies/${AB_PKG_POLICY_ID}$`).test(
          new URL(req.url()).pathname
        )
    );
    const soPutPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
          new URL(req.url()).pathname
        )
    );
    // Override SO handler to also handle PUT (Playwright LIFO: this route is checked first).
    await page.route(
      (url) =>
        new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname) && true,
      async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: { id: DEP_ID } }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.testSubj.locator('authenticateAndDeployStep-nextButton').click();

    // Dirty redeploy must PUT the Fleet package policy carrying the changed bucket_arn.
    const pkgPutRequest = await pkgPutPromise;
    expect(pkgPutRequest.postData()).toContain('agent-drift-bucket');
    // SO must be updated with the new serviceVars so resume reflects the current settings.
    const soRequest = await soPutPromise;
    expect(JSON.stringify(JSON.parse(soRequest.postData() ?? '{}'))).toContain(
      'agent-drift-bucket'
    );

    // isDirty cleared → session reflects the new state. The step may navigate away after
    // a successful deploy (unmounting the callout), so assert on session state rather than
    // UI element visibility to avoid a vacuously-true assertion (4123330463).
    const isDirtyAfter = await page.evaluate(
      ({ key }) => {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        try {
          return (JSON.parse(raw) as Record<string, unknown>).isDirty ?? null;
        } catch {
          return null;
        }
      },
      { key: DETECT_AND_REVIEW_SESSION_KEY }
    );
    expect(isDirtyAfter).toBeFalsy();
  });
});
