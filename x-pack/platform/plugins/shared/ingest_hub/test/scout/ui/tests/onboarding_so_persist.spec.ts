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
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';

// Minimal aws manifest with elb (managed_integration). Identity federation is supported
// (no hide_in_var_group_options) so LazyAwsIdentityFederationSetup renders and immediately
// calls onReadyChange(true) via the pre-seeded connectorId, enabling the deploy button.
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
    // Return empty connector list immediately so AwsIdentityFederationSetup finishes loading
    // without waiting on a real server response. The pre-seeded connectorId still marks the
    // form ready via onReadyChange(true) from initialConnectorId.
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

  test('Deploy fires SO POST with connector and provider, then navigates to detect-and-review', async ({
    browserAuth,
    page,
  }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: ['elb'],
      globalRegion: 'us-east-1',
      serviceVars: {},
      authenticateAndDeployStep: {
        connectorId: 'connector-test-123',
        authMethod: 'identity_federation',
      },
    });

    // Register before clicking so the promise is live when the request fires.
    const soCreatePromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/cloud_onboarding_deployments$/.test(new URL(req.url()).pathname)
    );

    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments$/.test(url.pathname),
      (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ item: { id: 'dep-e2e-001' } }),
            })
          : route.continue()
    );
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-e2e-001$/.test(url.pathname),
      (route) =>
        route.request().method() === 'PUT'
          ? route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ item: { id: 'dep-e2e-001' } }),
            })
          : route.continue()
    );
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { id: 'p-e2e-001', name: 'test-policy' } }),
        })
    );

    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
    // Playwright waits for the button to be actionable (enabled) before clicking.
    // The button becomes enabled once LazyAwsIdentityFederationSetup mounts and calls
    // onReadyChange(true) via the pre-seeded initialConnectorId.
    await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

    // Verify SO POST fired with the connector, provider, and services.
    const soCreateReq = await soCreatePromise;
    const body = soCreateReq.postDataJSON() as Record<string, unknown>;
    expect(body.provider).toBe('aws');
    expect(body.connectorId).toBe('connector-test-123');
    expect(body.mechanisms).toContain('managed_integration');
    expect(body.services).toContain('elb');

    // After deploy completes the Next button is enabled; clicking it navigates to detect-and-review.
    await page.testSubj.locator('authenticateAndDeployStep-nextButton').click();
    await expect(page.testSubj.locator('onboardingStep-detect-and-review')).toBeVisible();
  });

  test('?deploymentId= resume lands on detect-and-review and keeps the param in the URL', async ({
    browserAuth,
    page,
  }) => {
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-e2e-resume$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: {
              id: 'dep-e2e-resume',
              provider: 'aws',
              connectorId: 'connector-resume-456',
              mechanisms: ['managed_integration'],
              services: ['elb'],
              status: 'succeeded',
              attemptCount: 1,
              globalRegion: 'eu-west-1',
              serviceVars: {},
            },
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', { params: { deploymentId: 'dep-e2e-resume' } });

    // App must land on detect-and-review (steps 1–3 are marked complete by hydration).
    await expect(page.testSubj.locator('onboardingStep-detect-and-review')).toBeVisible();

    // ?deploymentId stays in the URL as the edit-mode indicator.
    expect(page.url()).toContain('deploymentId=dep-e2e-resume');
  });

  test('static-keys ?deploymentId= resume renders StaticKeysReplaceView', async ({
    browserAuth,
    page,
  }) => {
    await page.route(
      (url) => /\/api\/fleet\/cloud_onboarding_deployments\/dep-static-resume$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            item: {
              id: 'dep-static-resume',
              provider: 'aws',
              authMethod: 'static_keys',
              mechanisms: ['managed_integration'],
              services: ['elb'],
              status: 'succeeded',
              attemptCount: 1,
              globalRegion: 'us-west-2',
              serviceVars: {},
            },
          }),
        })
    );

    await browserAuth.loginAsAdmin();
    await page.gotoApp('onboarding/aws', {
      params: { deploymentId: 'dep-static-resume' },
      hash: 'authenticate-and-deploy',
    });

    // Static-keys resume shows the Replace form with hidden credential toggles.
    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();
    await expect(page.testSubj.locator('staticKeysReplace-accessKeyId-toggle')).toBeVisible();
    await expect(page.testSubj.locator('staticKeysReplace-secretAccessKey-toggle')).toBeVisible();
  });
});
