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
          JSON.stringify({ connectorId: 'connector-test-123', authType: 'identity_federation' })
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
        /\/api\/fleet\/cloud_onboarding_deployments\/dep-e2e-001$/.test(
          new URL(req.url()).pathname
        )
    );

    // Mock managed integrations (agentless policy create).
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { policy_ids: ['p-e2e-001'] } }),
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

    // Verify SO PUT fired with status after allSettled.
    const soUpdateReq = await soUpdatePromise;
    const soUpdateBody = soUpdateReq.postDataJSON() as { status: string };
    expect(soUpdateBody.status).toMatch(/succeeded|failed/);
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
    await page.waitForLoadState('networkidle');

    // ?deploymentId should have been stripped — reload won't re-hydrate.
    expect(page.url()).not.toContain('deploymentId');

    // Session storage should be populated from the SO.
    const sessionState = await page.evaluate(
      ({
        servicesKey,
        settingsKey,
        authKey,
        detectKey,
      }: {
        servicesKey: string;
        settingsKey: string;
        authKey: string;
        detectKey: string;
      }) => ({
        services: JSON.parse(sessionStorage.getItem(servicesKey) ?? 'null'),
        settings: JSON.parse(sessionStorage.getItem(settingsKey) ?? 'null'),
        auth: JSON.parse(sessionStorage.getItem(authKey) ?? 'null'),
        detect: JSON.parse(sessionStorage.getItem(detectKey) ?? 'null'),
      }),
      {
        servicesKey: SERVICES_STEP_SESSION_KEY,
        settingsKey: SERVICE_SETTINGS_SESSION_KEY,
        authKey: AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
        detectKey: DETECT_AND_REVIEW_SESSION_KEY,
      }
    );

    expect(sessionState.services?.selectedServiceIds).toContain('elb');
    expect(sessionState.settings?.globalRegion).toBe('eu-west-1');
    expect(sessionState.auth?.connectorId).toBe('connector-resume-456');
    expect(sessionState.detect?.onboardingDeploymentId).toBe('dep-e2e-resume');
  });
});
