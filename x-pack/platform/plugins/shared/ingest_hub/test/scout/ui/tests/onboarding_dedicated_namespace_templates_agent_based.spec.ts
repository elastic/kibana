/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ScoutPage, BrowserAuthFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  useOnboardingFeatureFlag,
  expectOnboardingStepVisible,
  mockAwsPackage,
  SERVICE_SETTINGS_SESSION_KEY,
  AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
  DETECT_AND_REVIEW_SESSION_KEY,
} from '../helpers/onboarding';
import {
  ACCESS_KEY_REF,
  SECRET_KEY_REF,
  AB_POLICY_ID,
  ELB_INSTANCE,
  fulfillJson,
  mockDeploymentSo,
  seedSession,
  soItem,
} from '../helpers/stored_secrets';
import {
  TWO_SERVICE_AWS_PACKAGE,
  backToServiceSettings,
  continueToDeploy,
  mockInstalledAwsPackage,
} from '../helpers/policy_updates';

const DEP_ID = 'dep-dedicated-templates-ab-001';
const AGENT_POLICY_ID = 'mock-agent-policy-id';

/**
 * A deployed agent-based flow, ready to deploy again. The package policy PUT goes through the
 * Next click, which navigates away as soon as the deploy is done, so the namespace opt-in has to
 * be sent before that.
 */
const seedDeployedAgentBasedFlow = async (
  browserAuth: BrowserAuthFixture,
  page: ScoutPage,
  enabledFor: string[] = []
) => {
  await mockAwsPackage(page, TWO_SERVICE_AWS_PACKAGE);
  // After the package mock, so these routes answer first.
  const packageRequests = await mockInstalledAwsPackage(page, enabledFor);
  // An uncaught error can unmount the step the test is waiting for, or only show up after it.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  // The package responses as the browser received them, in order, to tell what loaded after the
  // update. The mock answering is not enough: the page still has to receive it and render.
  const packageResponses: string[] = [];
  page.on('response', async (response) => {
    if (!/\/api\/fleet\/epm\/packages\/aws(\/[^/]+)?$/.test(new URL(response.url()).pathname)) {
      return;
    }
    await response.finished();
    packageResponses.push(response.request().method());
  });
  await page.route(
    (url) => /\/api\/fleet\/cloud_connectors/.test(url.pathname),
    (route) => route.fulfill(fulfillJson({ items: [] }))
  );
  await mockDeploymentSo(
    page,
    DEP_ID,
    soItem(DEP_ID, {
      mechanisms: ['agent_based'],
      policyIdsByInstance: { elb: AB_POLICY_ID },
      agentPolicyIds: [AGENT_POLICY_ID],
    })
  );
  await page.route(
    (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
    (route) =>
      route.fulfill(
        fulfillJson({
          items: [{ id: AGENT_POLICY_ID, name: 'Mock Agent Policy' }],
          total: 1,
          page: 1,
          perPage: 20,
        })
      )
  );
  await page.route(
    (url) => new RegExp(`/api/fleet/package_policies/${AB_POLICY_ID}$`).test(url.pathname),
    async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill(fulfillJson({ item: { id: AB_POLICY_ID } }));
        return;
      }
      await route.fulfill(
        fulfillJson({
          item: {
            name: 'mock-ab-pkg-policy-name',
            namespace: 'default',
            package: { name: 'aws', version: '7.1.1' },
            policy_ids: [AGENT_POLICY_ID],
            vars: {
              access_key_id: { value: ACCESS_KEY_REF },
              secret_access_key: { value: SECRET_KEY_REF },
            },
          },
        })
      );
    }
  );

  await browserAuth.loginAsAdmin();
  await seedSession(page, [
    {
      key: DETECT_AND_REVIEW_SESSION_KEY,
      value: {
        policyIdsByInstance: { elb: AB_POLICY_ID },
        serviceStatuses: { elb: 'receiving' },
        onboardingDeploymentId: DEP_ID,
        failedInstances: [],
        deployErrors: {},
      },
    },
    {
      key: SERVICE_SETTINGS_SESSION_KEY,
      value: {
        globalRegion: 'us-east-1',
        instances: [ELB_INSTANCE],
        serviceVars: {},
      },
    },
    {
      key: AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
      value: {
        deploymentMethod: 'agent_based',
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: [AGENT_POLICY_ID],
        agentCredentialMethod: 'static_keys',
        authMethod: 'static_keys',
      },
    },
  ]);
  await page.gotoApp('onboarding/aws', {
    params: { deploymentId: DEP_ID },
    hash: 'authenticate-and-deploy',
  });
  await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
  return { packageRequests, pageErrors, packageResponses };
};

/**
 * Adds a second service so the next click has something to deploy, sets the namespace and the
 * switch on the settings step (changing the services resets what was seeded), then clicks Next.
 */
const deployWithNext = async (
  page: ScoutPage,
  { namespace, dedicatedTemplates }: { namespace: string; dedicatedTemplates: boolean }
) => {
  await backToServiceSettings(page, ['guardduty']);
  // The integration name is required and is prefilled once the step has loaded, so Continue stays
  // disabled until then.
  await expect(page.testSubj.locator('sharedSettingsIntegrationName')).not.toHaveValue('');
  await page.testSubj.locator('sharedSettingsAdvancedToggle').click();
  const namespaceInput = page.testSubj.locator('sharedSettingsNamespace').locator('input');
  await namespaceInput.fill(namespace);
  await namespaceInput.press('Enter');
  if (dedicatedTemplates) {
    const dedicatedSwitch = page.testSubj.locator('sharedSettingsDedicatedNamespaceTemplates');
    await expect(dedicatedSwitch).toBeEnabled();
    await dedicatedSwitch.click();
    await expect(dedicatedSwitch).toHaveAttribute('aria-checked', 'true');
  }
  await continueToDeploy(page);
  await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
  const nextButton = page.testSubj.locator('authenticateAndDeployStep-nextButton');
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  // The wizard moves on only once the deploy has finished.
  await expectOnboardingStepVisible(page, 'detect-and-review');
};

test.describe(
  'Onboarding — dedicated index templates for the global namespace (agent-based)',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test('the Next click that deploys also adds the namespace to the installed package', async ({
      browserAuth,
      page,
    }) => {
      const { packageRequests, pageErrors, packageResponses } = await seedDeployedAgentBasedFlow(
        browserAuth,
        page,
        ['staging']
      );

      await deployWithNext(page, { namespace: 'prod', dedicatedTemplates: true });

      // The step is gone by now, so this fails if the opt-in only reacts to the step's own state.
      await expect.poll(() => packageRequests.updates.length).toBe(1);
      // The next step loads the installed package right after the opt-in. A page error from it can
      // arrive after the step is already visible, so wait until the browser has received that
      // response and then let the page render before looking at the errors.
      // The update's own response first, or a GET from the setup would satisfy the wait below.
      await expect.poll(() => packageResponses).toContain('PUT');
      await expect
        .poll(() => packageResponses.slice(packageResponses.lastIndexOf('PUT') + 1))
        .toContain('GET');
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      expect(packageRequests.updates[0]).toStrictEqual({
        packageName: 'aws',
        version: '7.1.1',
        body: { namespace_customization_enabled_for: ['staging', 'prod'] },
      });
      expect(pageErrors).toStrictEqual([]);
    });

    test('with the switch off, the deploy leaves the package alone', async ({
      browserAuth,
      page,
    }) => {
      const { packageRequests } = await seedDeployedAgentBasedFlow(browserAuth, page);

      await deployWithNext(page, { namespace: 'prod', dedicatedTemplates: false });

      expect(packageRequests.updates).toHaveLength(0);
    });
  }
);
