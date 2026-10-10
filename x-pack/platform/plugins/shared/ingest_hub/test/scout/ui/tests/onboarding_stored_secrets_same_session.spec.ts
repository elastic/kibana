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
import { ACCESS_KEY_REF, SECRET_KEY_REF, fulfillJson } from '../helpers/stored_secrets';

// Two services of the aws package; no required vars so the settings step passes untouched.
const template = (name: string) => ({
  name,
  title: name,
  data_streams: [`${name}_logs`],
  deployment_modes: { agentless: { enabled: true } },
  inputs: [{ type: 'aws-s3' }],
});
const dataStream = (name: string) => ({
  path: `${name}_logs`,
  type: 'logs',
  streams: [{ input: 'aws-s3', vars: [] }],
});
const MOCK_AWS_PACKAGE = {
  item: {
    version: '7.1.1',
    vars: [
      { name: 'access_key_id', type: 'text', secret: true },
      { name: 'secret_access_key', type: 'password', secret: true },
    ],
    policy_templates: [template('elb'), template('guardduty')],
    data_streams: [dataStream('elb'), dataStream('guardduty')],
  },
};

test.describe(
  'Onboarding — adding a service in the same session reuses the stored keys',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test('the second service joins the first policy and keeps its secret refs, not typed keys', async ({
      browserAuth,
      page,
    }) => {
      await mockAwsPackage(page, MOCK_AWS_PACKAGE);
      // Identity federation is offered, so the user picks Access keys first.
      await page.route(
        (url) => /\/api\/fleet\/cloud_connectors/.test(url.pathname),
        (route) => route.fulfill(fulfillJson({ items: [] }))
      );

      const created: Array<Record<string, any>> = [];
      const updated: Array<Record<string, any>> = [];
      let so: Record<string, unknown> = {};
      await page.route(
        (url) => /\/api\/fleet\/managed_integrations$/.test(url.pathname),
        async (route) => {
          if (route.request().method() === 'POST') {
            created.push(JSON.parse(route.request().postData() ?? '{}'));
            await route.fulfill(fulfillJson({ item: { id: `policy-${created.length}` } }));
          } else {
            await route.fallback();
          }
        }
      );
      // Policies hold both keys as secret refs once created.
      await page.route(
        (url) => /\/api\/fleet\/managed_integrations\/policy-\d+$/.test(url.pathname),
        (route) => {
          if (route.request().method() === 'PUT') {
            updated.push(JSON.parse(route.request().postData() ?? '{}'));
          }
          return route.fulfill(
            fulfillJson({
              item: {
                name: 'policy',
                namespace: 'default',
                package: { name: 'aws' },
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
          const method = route.request().method();
          if (method === 'GET') {
            await route.fulfill(fulfillJson({ item: so }));
            return;
          }
          const body = JSON.parse(route.request().postData() ?? '{}');
          so = {
            id: 'dep-1',
            provider: 'aws',
            status: 'succeeded',
            attemptCount: 1,
            ...so,
            ...body,
          };
          await route.fulfill(fulfillJson({ item: so }));
        }
      );

      await navigateToOnboardingStep(browserAuth, page, 'authenticate-and-deploy', {
        selectedServiceIds: ['elb'],
        globalRegion: 'us-east-1',
      });

      // First deploy: Access keys chosen, keys typed in.
      await page.getByRole('radio', { name: /access keys/i }).click({ force: true });
      await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('mi1');
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('mis1');
      const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
      await expect(deployButton).toBeEnabled();
      await deployButton.click();
      await expect.poll(() => created.length).toBe(1);
      expect(created[0].vars.access_key_id).toBe('mi1');
      await expect(
        page.testSubj.locator('managedIntegrationsSection').getByText('Done')
      ).toBeVisible();

      // Back to Services (in-app navigation keeps the wizard state), add the second service.
      await page.evaluate(() => {
        window.location.hash = 'services';
      });
      await expect(page.testSubj.locator('onboardingStep-services')).toBeVisible();
      await page.testSubj.locator('servicesStep-toggle-guardduty').click();
      await page.testSubj.locator('servicesStep-continueButton').click();
      await expect(page.testSubj.locator('onboardingStep-service-settings')).toBeVisible();
      await page.testSubj.locator('serviceSettingsStep-continueButton').click();
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      // The keys come from the stored secrets: placeholders, nothing typed.
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();

      await expect(deployButton).toBeEnabled();
      await deployButton.click();
      // Same package: the first policy is updated with both services, no second one is created.
      await expect(
        page.testSubj.locator('managedIntegrationsSection').getByText('Done')
      ).toBeVisible();
      expect(updated).toHaveLength(1);
      expect(created).toHaveLength(1);

      expect(updated[0].vars.access_key_id).toStrictEqual(ACCESS_KEY_REF);
      expect(updated[0].vars.secret_access_key).toStrictEqual(SECRET_KEY_REF);
      // Both services are enabled in the one policy; a disabled stub would not be a deployed service.
      expect(updated[0].inputs['elb-aws-s3'].enabled).toBe(true);
      expect(updated[0].inputs['guardduty-aws-s3'].enabled).toBe(true);
    });
  }
);
