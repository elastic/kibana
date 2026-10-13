/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockAwsPackage, navigateToOnboardingStep } from './onboarding';
import { ACCESS_KEY_REF, SECRET_KEY_REF, fulfillJson } from './stored_secrets';

// Two services of the `aws` package: adding the second one to a deployed first one must update the
// first one's package policy instead of creating another.
const template = (name: string) => ({
  name,
  title: name,
  data_streams: [`${name}_logs`],
  deployment_modes: { agentless: { enabled: true } },
  inputs: [{ type: 'aws-s3' }],
});
// guardduty has an optional setting, so its settings flyout (where the namespace is set) can be
// opened; elb has none and stays untouched.
const dataStream = (name: string, vars: unknown[] = []) => ({
  path: `${name}_logs`,
  type: 'logs',
  streams: [{ input: 'aws-s3', vars }],
});
export const TWO_SERVICE_AWS_PACKAGE = {
  item: {
    version: '7.1.1',
    vars: [
      { name: 'access_key_id', type: 'text', secret: true },
      { name: 'secret_access_key', type: 'password', secret: true },
    ],
    policy_templates: [template('elb'), template('guardduty')],
    data_streams: [
      dataStream('elb'),
      dataStream('guardduty', [
        { name: 'bucket_arn', type: 'text', title: 'Bucket ARN', show_user: true },
      ]),
    ],
  },
};

export interface MiRequests {
  /** Bodies of `POST /managed_integrations`; the Nth one answers with the id `policy-N`. */
  created: Array<Record<string, any>>;
  /** `PUT /managed_integrations/<id>` calls, failed ones included. */
  updated: Array<{ policyId: string; body: Record<string, any> }>;
  /** Makes the next PUT fail once with a server error. */
  failNextUpdate: () => void;
}

/**
 * Mocks everything a managed-integrations deploy touches: the package, cloud connectors, the
 * create and update routes (recording what the wizard sends), the policy GET (holding both keys as
 * secret refs, as Fleet does) and the deployment saved object, which keeps whatever is written to it.
 */
export async function mockManagedIntegrations(page: ScoutPage): Promise<MiRequests> {
  await mockAwsPackage(page, TWO_SERVICE_AWS_PACKAGE);
  await page.route(
    (url) => /\/api\/fleet\/cloud_connectors/.test(url.pathname),
    (route) => route.fulfill(fulfillJson({ items: [] }))
  );

  const requests: MiRequests = {
    created: [],
    updated: [],
    failNextUpdate: () => {
      failUpdate = true;
    },
  };
  let failUpdate = false;
  let so: Record<string, unknown> = {};

  await page.route(
    (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      requests.created.push(JSON.parse(route.request().postData() ?? '{}'));
      await route.fulfill(fulfillJson({ item: { id: `policy-${requests.created.length}` } }));
    }
  );
  await page.route(
    (url) => /\/api\/fleet\/managed_integrations\/policy-\d+$/.test(url.pathname),
    async (route) => {
      const policyId = new URL(route.request().url()).pathname.split('/').pop() as string;
      if (route.request().method() === 'PUT') {
        requests.updated.push({
          policyId,
          body: JSON.parse(route.request().postData() ?? '{}'),
        });
        if (failUpdate) {
          failUpdate = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ statusCode: 500, message: 'update failed' }),
          });
          return;
        }
      }
      await route.fulfill(
        fulfillJson({
          item: {
            id: policyId,
            name: 'policy',
            namespace: 'default',
            package: { name: 'aws', version: '7.1.1' },
            cloud_connector: null,
            vars: { access_key_id: ACCESS_KEY_REF, secret_access_key: SECRET_KEY_REF },
          },
        })
      );
    }
  );
  await page.route(
    (url) => /\/api\/fleet\/cloud_onboarding_deployments(\/[^/]+)?$/.test(url.pathname),
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill(fulfillJson({ item: so }));
        return;
      }
      so = {
        id: 'dep-1',
        provider: 'aws',
        status: 'succeeded',
        attemptCount: 1,
        ...so,
        ...JSON.parse(route.request().postData() ?? '{}'),
      };
      await route.fulfill(fulfillJson({ item: so }));
    }
  );

  return requests;
}

/** Deploys the `elb` service with typed access keys and waits for its policy to be created. */
export async function deployElbWithTypedKeys(
  browserAuth: Parameters<typeof navigateToOnboardingStep>[0],
  page: ScoutPage,
  requests: MiRequests
) {
  await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
    selectedServiceIds: ['elb'],
    globalRegion: 'us-east-1',
  });
  await page.getByRole('radio', { name: /access keys/i }).click({ force: true });
  await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('mi1');
  await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('mis1');
  const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
  await expect(deployButton).toBeEnabled();
  await deployButton.click();
  await expect.poll(() => requests.created.length).toBe(1);
  await expect(page.testSubj.locator('managedIntegrationsSection').getByText('Done')).toBeVisible();
}

/**
 * Waits until the deploy has finished. Assert "no other request was sent" only after this: a
 * request recorded early in a deploy says nothing about the ones that follow it.
 */
export async function expectDeployDone(page: ScoutPage) {
  await expect(page.testSubj.locator('managedIntegrationsSection').getByText('Done')).toBeVisible();
}

/** Back to Services (in-app navigation keeps the wizard state) and on to the settings step. */
export async function backToServiceSettings(page: ScoutPage, toggleServiceIds: string[] = []) {
  await page.evaluate(() => {
    window.location.hash = 'services';
  });
  await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();
  for (const id of toggleServiceIds) {
    await page.testSubj.locator(`servicesStep-toggle-${id}`).click();
  }
  await page.testSubj.locator('servicesStep-continueButton').click();
  await expect(page.testSubj.locator('onboardingStep-service-settings')).toBeVisible();
}

export async function continueToDeploy(page: ScoutPage) {
  await page.testSubj.locator('serviceSettingsStep-continueButton').click();
  await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
}
