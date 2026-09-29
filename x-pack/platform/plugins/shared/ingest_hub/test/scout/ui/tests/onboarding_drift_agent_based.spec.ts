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

test.describe(
  'Onboarding drift detection and redeploy — agent-based',
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
          new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname) &&
          true,
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
      // Poll instead of a one-shot read: soPutPromise resolves when the PUT is SENT, but
      // isDirty is only written after the response lands and React state updates — a one-shot
      // evaluate races and can read stale state (4123900598).
      await page.waitForFunction(
        ({ key }) => {
          const raw = sessionStorage.getItem(key);
          if (!raw) return false;
          try {
            return !(JSON.parse(raw) as Record<string, unknown>).isDirty;
          } catch {
            return false;
          }
        },
        { key: DETECT_AND_REVIEW_SESSION_KEY }
      );
    });

    test('agent-based policy-selection drift: changed selectedAgentPolicyIds triggers callout and PUT carries new policy', async ({
      browserAuth,
      page,
    }) => {
      // SO was deployed to 'old-agent-policy-id'. User changed agent policy selection to
      // 'new-agent-policy-id' in session. Drift check detects the mismatch → callout shown.
      // On Next, the Fleet PUT must carry policy_ids: ['new-agent-policy-id'] and SO PUT must
      // persist agentPolicyIds: ['new-agent-policy-id'] so resume uses the correct policy.
      const DEP_ID = 'dep-ab-policy-drift-001';
      const OLD_AGENT_POLICY_ID = 'old-agent-policy-id';
      const NEW_AGENT_POLICY_ID = 'new-agent-policy-id';
      const AB_PKG_POLICY_ID = 'mock-ab-pkg-policy-id-2';

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
                agentPolicyIds: [OLD_AGENT_POLICY_ID],
                status: 'succeeded',
                attemptCount: 1,
                globalRegion: 'us-east-1',
              },
            }),
          })
      );

      // Agent policies combobox — return both policies so the combobox loads and
      // selectedAgentPolicyIds is preserved during reconciliation.
      await page.route(
        (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [
                { id: OLD_AGENT_POLICY_ID, name: 'Old Agent Policy' },
                { id: NEW_AGENT_POLICY_ID, name: 'New Agent Policy' },
              ],
              total: 2,
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

      // Seed detectAndReview so isAlreadyDeployed=true after drift settles.
      await page.evaluate(
        ({ key, depId }) => {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              policyIdsByInstance: { elb: 'mock-ab-pkg-policy-id-2' },
              serviceStatuses: { elb: 'receiving' },
              onboardingDeploymentId: depId,
              failedInstances: [],
              deployErrors: {},
            })
          );
        },
        { key: DETECT_AND_REVIEW_SESSION_KEY, depId: DEP_ID }
      );

      // Seed auth step with the NEW policy selection — different from SO's agentPolicyIds.
      await page.evaluate(
        ({ key, newId }) => {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              deploymentMethod: 'agent_based',
              agentHostsMode: 'existing',
              selectedAgentPolicyIds: [newId],
              agentCredentialMethod: 'assume_role',
              authMethod: 'assume_role',
            })
          );
        },
        { key: AUTHENTICATE_AND_DEPLOY_SESSION_KEY, newId: NEW_AGENT_POLICY_ID }
      );

      // Seed instances so buildAgentBasedTargets returns a non-empty targets list; without it
      // showAgentSection stays false and the drift callout never renders.
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

      const soGetPromise = page.waitForResponse(
        (resp) =>
          new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(
            new URL(resp.url()).pathname
          ) && resp.status() === 200
      );
      await page.reload();
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
      await soGetPromise;

      // Policy-selection drift detected: session ['new-agent-policy-id'] vs SO ['old-agent-policy-id'].
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

      // Enter roleArn so the credential is ready for deploy.
      await page.testSubj
        .locator('agentBasedSection-roleArn')
        .fill('arn:aws:iam::123456789012:role/MyRole');
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();

      // Mock Fleet package policy GET+PUT.
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
                  policy_ids: [OLD_AGENT_POLICY_ID],
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
      await page.route(
        (url) =>
          new RegExp(`/api/fleet/cloud_onboarding_deployments/${DEP_ID}$`).test(url.pathname) &&
          true,
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

      // Fleet PUT must attach the policy to the NEW agent policy, not the old one.
      const pkgPutRequest = await pkgPutPromise;
      expect(pkgPutRequest.postData()).toContain(NEW_AGENT_POLICY_ID);
      expect(pkgPutRequest.postData()).not.toContain(OLD_AGENT_POLICY_ID);
      // SO PUT must persist the new agentPolicyIds so resume hydrates the correct selection.
      const soRequest = await soPutPromise;
      const soPutBody = JSON.parse(soRequest.postData() ?? '{}');
      expect(soPutBody.agentPolicyIds).toStrictEqual([NEW_AGENT_POLICY_ID]);
    });
  }
);
