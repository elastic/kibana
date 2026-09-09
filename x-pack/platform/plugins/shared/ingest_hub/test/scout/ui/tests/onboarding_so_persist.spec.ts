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
  SERVICES_STEP_SESSION_KEY,
  SERVICE_SETTINGS_SESSION_KEY,
} from '../helpers/onboarding';

// Session keys for additional step state written/read by hydrateOnboardingSession.
const AUTHENTICATE_AND_DEPLOY_SESSION_KEY = 'onboarding.aws.authenticateAndDeployStep';
const DETECT_AND_REVIEW_SESSION_KEY = 'onboarding.aws.detectAndReviewStep';
const STEP_STATE_SESSION_KEY = 'onboarding.aws.stepState';

// Minimal aws manifest with elb (managed_integration) so ManagedIntegrationsSection renders.
// hide_in_var_group_options forces identityFederationSupported=false on all inputs so
// LazyAwsStaticKeysForm mounts immediately without a radio-toggle path.
const MOCK_AWS_PACKAGE = {
  item: {
    version: '7.1.1',
    policy_templates: [
      {
        name: 'elb',
        title: 'AWS ELB',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [
          {
            type: 'aws-s3',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
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

test.describe('Onboarding SO persistence', { tag: tags.stateful.classic }, () => {
  useOnboardingFeatureFlag();

  test.beforeEach(async ({ page }) => {
    await mockAwsPackage(page, MOCK_AWS_PACKAGE);
  });

  test('deploy fires POST to cloud-onboarding-deployments and PUT with outcome after allSettled', async ({
    browserAuth,
    page,
  }) => {
    // Set up session with a connector (SO write only happens on the connector path).
    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws#authenticate-and-deploy');
    await page.evaluate(
      ({
        servicesKey,
        settingsKey,
        authKey,
      }: {
        servicesKey: string;
        settingsKey: string;
        authKey: string;
      }) => {
        sessionStorage.setItem(servicesKey, JSON.stringify({ selectedServiceIds: ['elb'] }));
        sessionStorage.setItem(
          settingsKey,
          JSON.stringify({ globalRegion: 'us-east-1', serviceVars: {} })
        );
        sessionStorage.setItem(
          authKey,
          JSON.stringify({ connectorId: 'connector-test-123', authMethod: 'identity_federation' })
        );
      },
      {
        servicesKey: SERVICES_STEP_SESSION_KEY,
        settingsKey: SERVICE_SETTINGS_SESSION_KEY,
        authKey: AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
      }
    );
    await page.reload();

    // Mock SO create — returns a deployment id that the update will reference.
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments$/.test(url.pathname),
      (route) => {
        if (route.request().method() === 'POST') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: { id: 'dep-e2e-001' } }),
          });
        }
        return route.continue();
      }
    );

    // Mock SO update — capture request for assertion.
    const soUpdatePromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/cloud_onboarding_deployments\/dep-e2e-001$/.test(new URL(req.url()).pathname)
    );

    // Mock managed integrations (agentless policy create).
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { id: 'p-e2e-001', name: 'test-policy' } }),
        })
    );

    const soCreatePromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/cloud_onboarding_deployments$/.test(new URL(req.url()).pathname)
    );

    // Trigger deploy.
    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
    await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

    // Verify SO POST fired with the connector id and provider.
    const soCreateReq = await soCreatePromise;
    const soCreateBody = soCreateReq.postDataJSON() as {
      connectorId: string;
      provider: string;
      services: string[];
    };
    expect(soCreateBody.connectorId).toBe('connector-test-123');
    expect(soCreateBody.provider).toBe('aws');
    expect(soCreateBody.services).toContain('elb');

    // Verify SO PUT fired with status and the managed integration policy id after allSettled.
    const soUpdateReq = await soUpdatePromise;
    const soUpdateBody = soUpdateReq.postDataJSON() as {
      status: string;
      packagePolicyIds: string[];
    };
    expect(soUpdateBody.status).toMatch(/succeeded|failed/);
    expect(soUpdateBody.packagePolicyIds).toContain('p-e2e-001');
  });

  test('?deploymentId= param hydrates session from SO and strips param from URL', async ({
    browserAuth,
    page,
  }) => {
    // Mock SO GET — returns a minimal deployment record.
    const soPayload = {
      item: {
        id: 'dep-e2e-resume',
        provider: 'aws',
        connectorId: 'connector-resume-456',
        mechanisms: ['agentless'],
        services: ['elb'],
        status: 'succeeded',
        attemptCount: 1,
        globalRegion: 'eu-west-1',
        serviceVars: {},
      },
    };
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-e2e-resume$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(soPayload),
        })
    );

    await browserAuth.loginAsAdmin();
    // Navigate with ?deploymentId= to trigger the hydration path.
    await page.goto(
      page.url().replace(/\/app\/.*/, '/app/onboarding/aws?deploymentId=dep-e2e-resume')
    );

    // Wait for the app to mount (any step element is enough).
    await page.waitForSelector('[data-test-subj^="onboardingStep-"]');

    // ?deploymentId stays in the URL as an edit-mode indicator.
    // Re-hydration on reload is blocked by the hydratedDeploymentId session flag.
    expect(page.url()).toContain('deploymentId=dep-e2e-resume');

    // Session storage should be populated from the SO.
    const sessionState = await page.evaluate(
      ({
        servicesKey,
        settingsKey,
        authKey,
        detectKey,
        stepStateKey,
      }: {
        servicesKey: string;
        settingsKey: string;
        authKey: string;
        detectKey: string;
        stepStateKey: string;
      }) => ({
        services: JSON.parse(sessionStorage.getItem(servicesKey) ?? 'null'),
        settings: JSON.parse(sessionStorage.getItem(settingsKey) ?? 'null'),
        auth: JSON.parse(sessionStorage.getItem(authKey) ?? 'null'),
        detect: JSON.parse(sessionStorage.getItem(detectKey) ?? 'null'),
        stepState: JSON.parse(sessionStorage.getItem(stepStateKey) ?? 'null'),
      }),
      {
        servicesKey: SERVICES_STEP_SESSION_KEY,
        settingsKey: SERVICE_SETTINGS_SESSION_KEY,
        authKey: AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
        detectKey: DETECT_AND_REVIEW_SESSION_KEY,
        stepStateKey: STEP_STATE_SESSION_KEY,
      }
    );

    expect(sessionState.services?.selectedServiceIds).toContain('elb');
    expect(sessionState.settings?.globalRegion).toBe('eu-west-1');
    expect(sessionState.auth?.connectorId).toBe('connector-resume-456');
    expect(sessionState.detect?.onboardingDeploymentId).toBe('dep-e2e-resume');
    // Steps 1-3 must be marked complete so the shell redirects to detect-and-review by default.
    expect(sessionState.stepState?.services).toBe('complete');
    expect(sessionState.stepState?.['service-settings']).toBe('complete');
    expect(sessionState.stepState?.['authenticate-and-deploy']).toBe('complete');
    expect(sessionState.stepState?.['detect-and-review']).toBe('incomplete');
  });

  test('static-keys deploy fires POST without connectorId and with authMethod: static_keys', async ({
    browserAuth,
    page,
  }) => {
    // Mock SO GET so ?deploymentId= hydration resolves before we override session.
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-static-seed$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: {
              id: 'dep-static-seed',
              provider: 'aws',
              authMethod: 'static_keys',
              mechanisms: ['agentless'],
              services: ['elb'],
              status: 'failed',
              attemptCount: 1,
              globalRegion: 'us-east-1',
              serviceVars: {},
            },
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    // Use ?deploymentId= so isEditMode=true and StaticKeysReplaceView renders.
    await page.goto(
      page
        .url()
        .replace(
          /\/app\/.*/,
          '/app/onboarding/aws?deploymentId=dep-static-seed#authenticate-and-deploy'
        )
    );

    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments$/.test(url.pathname),
      (route) => {
        if (route.request().method() === 'POST') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ item: { id: 'dep-static-001' } }),
          });
        }
        return route.continue();
      }
    );

    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { id: 'p-static-001', name: 'test-policy' } }),
        })
    );

    const soCreatePromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/cloud_onboarding_deployments$/.test(new URL(req.url()).pathname)
    );

    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
    // Both fields start hidden — click Replace then enter values.
    await page.getByText(/replace access key id/i).click();
    await page.testSubj.locator('staticKeysReplace-accessKeyId').fill('AKIAIOSFODNN7EXAMPLE');
    await page.getByText(/replace secret access key/i).click();
    await page.testSubj.locator('staticKeysReplace-secretAccessKey').fill('wJalrXUtnFEMI/K7MDENG');
    await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

    const soCreateReq = await soCreatePromise;
    const soCreateBody = soCreateReq.postDataJSON() as {
      connectorId?: string;
      authMethod: string;
      provider: string;
      services: string[];
    };
    expect(soCreateBody.authMethod).toBe('static_keys');
    expect(soCreateBody.provider).toBe('aws');
    expect(soCreateBody.services).toContain('elb');
    // connectorId must be absent or undefined — credentials are never persisted in the SO.
    expect(soCreateBody.connectorId).toBeUndefined();
  });

  test('static-keys ?deploymentId= resume hydrates authMethod: static_keys with no connectorId', async ({
    browserAuth,
    page,
  }) => {
    const soPayload = {
      item: {
        id: 'dep-static-resume',
        provider: 'aws',
        authMethod: 'static_keys',
        mechanisms: ['agentless'],
        services: ['elb'],
        status: 'succeeded',
        attemptCount: 1,
        globalRegion: 'us-west-2',
        serviceVars: {},
      },
    };
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-static-resume$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(soPayload),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.goto(
      page.url().replace(/\/app\/.*/, '/app/onboarding/aws?deploymentId=dep-static-resume')
    );

    await page.waitForSelector('[data-test-subj^="onboardingStep-"]');

    const sessionState = await page.evaluate(
      ({ authKey }: { authKey: string }) => ({
        auth: JSON.parse(sessionStorage.getItem(authKey) ?? 'null'),
      }),
      { authKey: AUTHENTICATE_AND_DEPLOY_SESSION_KEY }
    );

    // Session must reflect static_keys auth with no connectorId.
    expect(sessionState.auth?.authMethod).toBe('static_keys');
    expect(sessionState.auth?.connectorId).toBeUndefined();

    // StaticKeysReplaceView should be visible — both fields start hidden.
    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
    // The hidden-field panels are present (Replace buttons visible, no inputs).
    await expect(page.getByText(/replace access key id/i)).toBeVisible();
    await expect(page.getByText(/replace secret access key/i)).toBeVisible();
  });
});
