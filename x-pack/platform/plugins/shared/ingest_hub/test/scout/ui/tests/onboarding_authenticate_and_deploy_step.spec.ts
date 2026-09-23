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

  test('policy cleanup: deselecting a service fires DELETE before deploying new service', async ({
    browserAuth,
    page,
  }) => {
    // Simulate: user previously deployed 'old-svc' (policy 'mock-old-policy-id'), then went back
    // to Step 1, deselected it, and selected 'elb' instead. policyIdsByInstance still has the
    // stale entry because removeDeployInstance was never called for Step 1 deselections.
    // The live-stale detection in handleDeploy should fire DELETE before creating the new elb policy.

    // Register route mocks BEFORE navigation to avoid race with early page requests.
    const requestOrder: string[] = [];

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
      detectAndReviewStep: {
        policyIdsByInstance: { 'old-svc': 'mock-old-policy-id' },
        serviceStatuses: {},
      },
    });

    await page.route(
      (url) => /\/api\/fleet\/managed_integrations(\/mock-old-policy-id)?$/.test(url.pathname),
      (route) => {
        const method = route.request().method();
        if (method === 'DELETE') requestOrder.push('delete');
        else if (method === 'POST') requestOrder.push('create');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(method === 'POST' ? { item: { id: 'mock-new-policy-id' } } : {}),
        });
      }
    );

    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();

    const accessKeyField = page.testSubj.locator('awsStaticKeysForm-accessKeyId');
    const secretKeyField = page.testSubj.locator('awsStaticKeysForm-secretAccessKey');
    await expect(accessKeyField).toBeVisible();
    await accessKeyField.fill('AKIATEST');
    await secretKeyField.fill('secrettest');

    const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
    await expect(deployButton).toBeEnabled();

    const deleteRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'DELETE' &&
        /\/api\/fleet\/managed_integrations\/mock-old-policy-id$/.test(new URL(req.url()).pathname)
    );
    const createRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/managed_integrations$/.test(new URL(req.url()).pathname)
    );

    await deployButton.click();

    await deleteRequestPromise;
    await createRequestPromise;
    // DELETE must fire before POST — cleanup is awaited before the new deploy starts.
    expect(requestOrder[0]).toBe('delete');
  });

  test('policy cleanup same-package: removing a service updates the shared policy (PUT, not DELETE) for the surviving service — cleanup-only when survivor already deployed', async ({
    browserAuth,
    page,
  }) => {
    // Simulate: two services (elb + a now-removed service) were deployed under the SAME
    // aws-package policy 'mock-shared-policy-id'. The user deselected the removed service
    // from Step 1 while keeping elb (already receiving). policyIdsByInstance has both mapped
    // to the same policy ID. Because of the live-stale entry, isAlreadyDeployed returns false
    // even though elb has 'receiving' status — cleanup must fire.
    //
    // Expected:
    //   PUT /api/fleet/managed_integrations/mock-shared-policy-id fires (UPDATE for survivor elb).
    //   DELETE must NOT fire — the policy survives because elb is still a member.
    //   POST must NOT fire — elb is already deployed (serviceStatuses: { elb: 'receiving' }).
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
      detectAndReviewStep: {
        // Both elb and the removed service share the same policy.
        policyIdsByInstance: {
          elb: 'mock-shared-policy-id',
          'removed-svc': 'mock-shared-policy-id',
        },
        // elb already deployed — cleanup-only scenario. Without the isAlreadyDeployed fix this
        // would short-circuit before cleanup, and the PUT would never fire.
        serviceStatuses: { elb: 'receiving' },
      },
    });

    // Intercept DELETE to detect misrouted cleanup — DELETE must NOT fire for the
    // partial-survival case. The handler fulfills so the test doesn't hang if it does fire.
    let deleteObserved = false;
    await page.route(
      (url) => /\/api\/fleet\/managed_integrations\//.test(url.pathname),
      (route) => {
        const method = route.request().method();
        if (method === 'DELETE') deleteObserved = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}',
        });
      }
    );

    await expect(page.testSubj.locator('managedIntegrationsSection')).toBeVisible();

    const accessKeyField = page.testSubj.locator('awsStaticKeysForm-accessKeyId');
    const secretKeyField = page.testSubj.locator('awsStaticKeysForm-secretAccessKey');
    await expect(accessKeyField).toBeVisible();
    await accessKeyField.fill('AKIATEST');
    await secretKeyField.fill('secrettest');

    const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
    await expect(deployButton).toBeEnabled();

    const updateRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/managed_integrations\/mock-shared-policy-id$/.test(
          new URL(req.url()).pathname
        )
    );
    await updateRequestPromise; // PUT — shared policy updated with elb inputs only
    await expect(deployButton).toBeHidden();
    expect(deleteObserved).toBe(false);

    await updateRequestPromise; // PUT — shared policy updated with elb inputs only
    expect(deleteObserved).toBe(false);
  });

  test('agent-based cleanup: removing a service updates the shared package policy for the surviving service (PUT, not DELETE)', async ({
    browserAuth,
    page,
  }) => {
    // Simulate: two services (elb + removed-svc) were deployed to the same package policy
    // ('shared-pkg-policy'). removed-svc was then deselected from Step 1. policyIdsByInstance
    // still holds both entries — live-stale detection triggers cleanup on the next Next click.
    //
    // Before the isAlreadyDeployed fix: isAlreadyDeployed returned true (elb had a policy ID),
    // so handleNext short-circuited without calling handleDeploy, and the PUT never fired.
    //
    // Expected after fix:
    //   PUT /api/fleet/package_policies/shared-pkg-policy fires (update for surviving elb).
    //   sendDeletePackagePolicy (POST to /package_policies/delete) must NOT fire — the policy
    //   survives because elb is still a member.

    // Register route mocks BEFORE navigation to avoid race with agent_policies fetch.
    let deleteObserved = false;
    await page.route(
      (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
    );

    // sendDeletePackagePolicy sends POST to /api/fleet/package_policies/delete (not HTTP DELETE).
    await page.route(
      (url) => /\/api\/fleet\/package_policies/.test(url.pathname),
      (route) => {
        if (
          route.request().method() === 'POST' &&
          new URL(route.request().url()).pathname.endsWith('/delete')
        ) {
          deleteObserved = true;
        }
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    );

    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: ['elb'],
      globalRegion: 'us-east-1',
      instances: [{ instanceId: 'elb', serviceId: 'elb', isDuplicate: false }],
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
      authenticateAndDeployStep: {
        deploymentMethod: 'agent_based',
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['mock-agent-policy-id'],
      },
      detectAndReviewStep: {
        // Both elb and the removed service share the same package policy.
        policyIdsByInstance: { 'removed-svc': 'shared-pkg-policy', elb: 'shared-pkg-policy' },
        serviceStatuses: {},
      },
    });

    await expect(page.testSubj.locator('agentBasedSection')).toBeVisible();

    const updateRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' &&
        /\/api\/fleet\/package_policies\/shared-pkg-policy$/.test(new URL(req.url()).pathname)
    );

    const nextButton = page.testSubj.locator('authenticateAndDeployStep-nextButton');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await updateRequestPromise; // PUT — shared policy updated with elb inputs only
    await expect(page.testSubj.locator('onboardingStep-detect-and-review')).toBeVisible();
    expect(deleteObserved).toBe(false);
  });

  test('agent-based: deploy fires POST /api/fleet/package_policies for existing agent policy', async ({
    browserAuth,
    page,
  }) => {
    // Simulate: user switched to agent-based mode, selected an existing agent policy
    // ('mock-agent-policy-id'), and is about to deploy ELB. The Next button triggers the
    // deploy (handleAgentDeployForNext) which calls deployToExistingAgentPolicies.
    // Expected: POST /api/fleet/package_policies fires with policy_ids: ['mock-agent-policy-id'].

    // Register route mocks BEFORE navigation to avoid race with agent_policies fetch.
    // Mock agent policies list (dropdown in existing-policy mode).
    await page.route(
      (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
    );

    // Mock package policy creation (the actual deploy call).
    await page.route(
      (url) => /\/api\/fleet\/package_policies$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ item: { id: 'mock-pkg-policy-id' } }),
        })
    );

    await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
      selectedServiceIds: ['elb'],
      globalRegion: 'us-east-1',
      instances: [{ instanceId: 'elb', serviceId: 'elb', isDuplicate: false }],
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
      authenticateAndDeployStep: {
        deploymentMethod: 'agent_based',
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['mock-agent-policy-id'],
      },
    });

    await expect(page.testSubj.locator('agentBasedSection')).toBeVisible();

    const createRequestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        /\/api\/fleet\/package_policies$/.test(new URL(req.url()).pathname)
    );

    const nextButton = page.testSubj.locator('authenticateAndDeployStep-nextButton');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    const createRequest = await createRequestPromise;
    const body = createRequest.postDataJSON() as { policy_ids?: string[] };
    expect(body.policy_ids).toEqual(['mock-agent-policy-id']);
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
