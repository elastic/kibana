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

// elb (DS: elb_logs, managed_integration): dual-transport S3+CloudWatch.
// Used because agentless.enabled → managed_integration preferred → ManagedIntegrationsSection renders.
// hide_in_var_group_options is set on all inputs to force identityFederationSupported=false so
// LazyAwsStaticKeysForm mounts directly (no radio-toggle path) — avoids a Suspense race where
// switching from identity federation leaves a window with neither form in the DOM.
//
// Granular buildPackageInputs shape assertions (stream keys, var values, disabled-input
// structure) live in use_deploy.test.ts (Jest). This spec verifies UI wiring only:
// session → reload → credentials → POST fires → success state renders.

// Minimal aws manifest — must include `version` so deployGroup can resolve pkgVersion.
const MOCK_AWS_PACKAGE_WITH_VERSION = {
  item: {
    version: '7.1.1',
    policy_templates: [
      {
        name: 'elb',
        title: 'AWS ELB',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        // hide_in_var_group_options makes identityFederationSupported=false for both inputs →
        // showIdentityFederation=false → no radio group renders → LazyAwsStaticKeysForm
        // mounts immediately after the section appears, avoiding a Suspense race condition
        // where switching radio tabs leaves a window with neither form in the DOM.
        inputs: [
          {
            type: 'aws-s3',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
          {
            type: 'aws-cloudwatch',
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

test.describe('Onboarding Authenticate and Deploy step', { tag: tags.stateful.classic }, () => {
  useOnboardingFeatureFlag();

  test.beforeEach(async ({ page }) => {
    await mockAwsPackage(page, MOCK_AWS_PACKAGE_WITH_VERSION);
  });

  test('deploy fires POST /api/fleet/managed_integrations and shows success state', async ({
    browserAuth,
    page,
  }) => {
    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: ['elb'],
      globalRegion: 'us-east-1',
      serviceVars: {
        elb: {
          enabledDataStreams: ['elb_logs'],
          varsByDataStream: {
            elb_logs: {
              enabledInputs: ['aws-s3'],
              varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::test-bucket' } },
            },
          },
        },
      },
    });

    await page.route(
      (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { policy_ids: ['mock-policy-id'] } }),
        })
    );

    // Wait for awsServicesMap to resolve and ManagedIntegrationsSection to render.
    // The section only appears after the React Query for the aws package manifest completes.
    // The mock sets identityFederationSupported=false for all inputs → showIdentityFederation=false
    // → no radio group → LazyAwsStaticKeysForm mounts as soon as the section appears.
    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();

    // Wait for the static-keys form (lazy-loaded Fleet component) to appear before filling.
    // EuiFieldText/EuiFieldPassword put data-test-subj on the <input> itself, so no child
    // .locator('input') is needed — the test-subj locator already IS the input element.
    const accessKeyField = page.testSubj.locator('awsStaticKeysForm-accessKeyId');
    const secretKeyField = page.testSubj.locator('awsStaticKeysForm-secretAccessKey');
    await expect(accessKeyField).toBeVisible();
    await accessKeyField.fill('AKIATEST');
    await secretKeyField.fill('secrettest');

    const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
    await expect(deployButton).toBeEnabled();

    // Register waitForRequest just before clicking so the 10s window starts from the click.
    const deployRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/managed_integrations$/.test(new URL(req.url()).pathname)
    );
    await deployButton.click();

    const deployRequest = await deployRequestPromise;
    const body = deployRequest.postDataJSON() as {
      inputs: Record<string, { enabled: boolean }>;
    };

    // Smoke-check: S3 input is wired through to the POST body.
    expect(body.inputs['elb-aws-s3']).toBeDefined();
    expect(body.inputs['elb-aws-s3'].enabled).toBe(true);

    // Success state: deploy button disappears and the Next button becomes enabled.
    // (The success message is inside the collapsible section which closes on isDone,
    // so we use the Next button — outside the section — as a stable indicator.)
    await expect(deployButton).toBeHidden();
    await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
  });
});
