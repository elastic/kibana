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

test.describe(
  'Onboarding drift detection and redeploy — error handling',
  { tag: tags.stateful.classic },
  () => {
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

    test('drift check error: SO GET failure shows error callout, Retry re-fetches and recovers', async ({
      browserAuth,
      page,
    }) => {
      // Validates that when the SO GET fails (e.g. transient 500), the drift check error callout
      // is shown and Next stays disabled. Clicking Retry re-fetches the SO; on success the
      // callout disappears and Next enables (isAlreadyDeployed=true from seeded statuses).
      const DEP_ID = 'dep-drift-so-error-001';

      // Call #1 (hydration) must succeed so hydratedDeploymentId is set and onboardingDeploymentId
      // populates the session, enabling the drift effect on the subsequent reload.
      // Calls #2+ fail until soShouldFail is set to false (simulating a transient error).
      let soCallCount = 0;
      let soShouldFail = true;
      await page.route(
        (url) =>
          new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname),
        (route) => {
          soCallCount++;
          if (soCallCount === 1) {
            void route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ item: makeSoItem(DEP_ID) }),
            });
          } else if (soShouldFail) {
            void route.fulfill({ status: 500, body: 'Internal Server Error' });
          } else {
            void route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ item: makeSoItem(DEP_ID) }),
            });
          }
        }
      );

      await browserAuth.loginAsAdmin();
      await page.gotoApp('onboarding/aws', {
        params: { deploymentId: DEP_ID },
        hash: 'authenticate-and-deploy',
      });
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      // Seed detectAndReview so isAlreadyDeployed=true once drift settles after retry.
      // Seed must happen after the first gotoApp so hydration (call #1) has already run and set
      // hydratedDeploymentId; the subsequent reload skips hydration and React reads our seeds.
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
      // Seed instances so deployGroups is non-empty and isAlreadyDeployed evaluates against the
      // seeded serviceStatuses rather than always returning false (deployGroups.length === 0).
      await page.evaluate(
        ({ key }) => {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              globalRegion: 'us-east-1',
              instances: [
                { instanceId: 'elb', serviceId: 'elb', name: 'AWS ELB', isDuplicate: false },
              ],
              serviceVars: {},
            })
          );
        },
        { key: SERVICE_SETTINGS_SESSION_KEY }
      );

      // Reload so React mounts with the seeded session (hydration is skipped because
      // hydratedDeploymentId was set by call #1). The drift effect fires and hits call #2 → 500.
      await page.reload();
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      // Wait for the drift check to fail and the error callout to appear.
      await expect(
        page.testSubj.locator('authenticateAndDeployStep-driftCheckErrorCallout')
      ).toBeVisible();
      // Next must be disabled while drift check failed (driftSettled=false).
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

      // Allow subsequent SO GETs to succeed (simulates transient error resolved).
      soShouldFail = false;
      const retryResponsePromise = page.waitForResponse(
        (resp) =>
          new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
            new URL(resp.url()).pathname
          ) && resp.status() === 200
      );
      await page.testSubj.click('authenticateAndDeployStep-driftCheckRetryButton');
      await retryResponsePromise;

      // Error callout gone — drift check resolved with no drift.
      await expect(
        page.testSubj.locator('authenticateAndDeployStep-driftCheckErrorCallout')
      ).toBeHidden();
      // Next enables: driftSettled=true, isAlreadyDeployed=true (from seeded statuses), isDirty=false.
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
    });
  }
);
