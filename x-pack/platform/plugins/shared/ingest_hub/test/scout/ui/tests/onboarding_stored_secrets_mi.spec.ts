/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  useOnboardingFeatureFlag,
  SERVICE_SETTINGS_SESSION_KEY,
  DETECT_AND_REVIEW_SESSION_KEY,
} from '../helpers/onboarding';
import {
  ACCESS_KEY_REF,
  SECRET_KEY_REF,
  MI_POLICY_ID,
  soRoute,
  ELB_INSTANCE,
  fulfillJson,
  mockCommonRoutes,
  mockDeploymentSo,
  seedSession,
  soItem,
} from '../helpers/stored_secrets';

test.describe(
  'Onboarding resume with stored secrets — managed integrations, static keys',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    const DEP_ID = 'dep-stored-secrets-mi-001';

    test.beforeEach(async ({ page }) => {
      await mockCommonRoutes(page);
      await mockDeploymentSo(
        page,
        DEP_ID,
        soItem(DEP_ID, {
          mechanisms: ['managed_integration'],
          policyIdsByInstance: { elb: MI_POLICY_ID },
        })
      );
      // The deployed policy holds both keys as secret refs.
      await page.route(
        (url) => new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(url.pathname),
        (route) =>
          route.fulfill(
            fulfillJson({
              item: {
                name: 'mock-mi-policy-name',
                namespace: 'default',
                package: { name: 'aws' },
                cloud_connector: null,
                vars: { access_key_id: ACCESS_KEY_REF, secret_access_key: SECRET_KEY_REF },
              },
            })
          )
      );
    });

    /**
     * Resume at Step 3. Entering with `?deploymentId=` hydrates the session from the SO, so the
     * deployed instance and any session-only settings are seeded afterwards and the page reloaded.
     * A deployed, unchanged section is collapsed.
     */
    async function resume(
      browserAuth: { loginAsAdmin: () => Promise<void> },
      page: ScoutPage,
      { serviceVars = {} }: { serviceVars?: Record<string, unknown> } = {}
    ) {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('onboarding/aws', {
        params: { deploymentId: DEP_ID },
        hash: 'authenticate-and-deploy',
      });
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      await seedSession(page, [
        {
          key: DETECT_AND_REVIEW_SESSION_KEY,
          value: {
            policyIdsByInstance: { elb: MI_POLICY_ID },
            serviceStatuses: { elb: 'receiving' },
            onboardingDeploymentId: DEP_ID,
            failedInstances: [],
            deployErrors: {},
          },
        },
        {
          key: SERVICE_SETTINGS_SESSION_KEY,
          value: { globalRegion: 'us-east-1', instances: [ELB_INSTANCE], serviceVars },
        },
      ]);
      // The drift check (SO GET) and the stored-secret lookup (policy GET) both run on mount.
      const soGet = page.waitForResponse(
        (resp) =>
          resp.request().method() === 'GET' && soRoute(DEP_ID)(new URL(resp.url())) && resp.ok()
      );
      const policyGet = page.waitForResponse(
        (resp) =>
          resp.request().method() === 'GET' &&
          new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(
            new URL(resp.url()).pathname
          )
      );
      await page.reload();
      await Promise.all([soGet, policyGet]);
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();
    }

    /**
     * A deployed, unchanged section is collapsed, and re-collapses if the deployment status settles
     * after it was opened, which unmounts the form. Retry opening it until the form is there.
     */
    async function openSectionUntilVisible(
      page: ScoutPage,
      target: ReturnType<ScoutPage['locator']>
    ) {
      await expect(async () => {
        if (!(await target.isVisible())) {
          await page.testSubj.locator('managedIntegrationsSection-headerButton').click();
        }
        await expect(target).toBeVisible({ timeout: 2000 });
      }).toPass();
    }

    /** Replaces the stored secret access key by typing `value`, retrying across a re-collapse. */
    async function replaceSecretKey(page: ScoutPage, value: string) {
      const replaceButton = page.testSubj.locator('awsStaticKeysForm-secretAccessKey-replace');
      const input = page.testSubj.locator('awsStaticKeysForm-secretAccessKey');
      await expect(async () => {
        if (!(await input.isVisible()) && !(await replaceButton.isVisible())) {
          await page.testSubj.locator('managedIntegrationsSection-headerButton').click();
        }
        if (await replaceButton.isVisible()) {
          await replaceButton.click();
        }
        await input.fill(value, { timeout: 2000 });
      }).toPass();
    }

    test('shows the stored keys instead of the replace-keys view', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page);
      await openSectionUntilVisible(
        page,
        page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')
      );

      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();
      await expect(page.testSubj.locator('staticKeysReplace-accessKeyId-toggle')).toBeHidden();
    });

    test('a settings change redeploys without retyping and sends the stored refs back', async ({
      browserAuth,
      page,
    }) => {
      // The session carries a bucket the SO does not know about: drift on the deployed service.
      await resume(browserAuth, page, {
        serviceVars: {
          elb: {
            enabledDataStreams: ['elb_logs'],
            varsByDataStream: {
              elb_logs: {
                enabledInputs: ['aws-s3'],
                varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::drift-bucket' } },
              },
            },
          },
        },
      });
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();

      const policyPut = page.waitForRequest(
        (req) =>
          req.method() === 'PUT' &&
          new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(
            new URL(req.url()).pathname
          )
      );
      await page.route(
        (url) => new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(url.pathname),
        async (route) => {
          if (route.request().method() === 'PUT') {
            await route.fulfill(fulfillJson({ item: { id: MI_POLICY_ID } }));
          } else {
            await route.fallback();
          }
        }
      );

      const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
      await expect(deployButton).toBeEnabled();
      await deployButton.click();

      const body = JSON.parse((await policyPut).postData() ?? '{}');
      expect(body.vars.access_key_id).toStrictEqual(ACCESS_KEY_REF);
      expect(body.vars.secret_access_key).toStrictEqual(SECRET_KEY_REF);
      expect(JSON.stringify(body)).toContain('drift-bucket');
    });

    test('replacing the secret access key sends the new value and keeps the access key id', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page);

      await replaceSecretKey(page, 'NEW-SECRET-VALUE');
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeHidden();
      // The stored access key id is untouched.
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();

      // Typing into a stored field replaces it: the step is marked as changed.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

      const policyPut = page.waitForRequest(
        (req) =>
          req.method() === 'PUT' &&
          new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(
            new URL(req.url()).pathname
          )
      );
      await page.route(
        (url) => new RegExp(`/api/fleet/managed_integrations/${MI_POLICY_ID}$`).test(url.pathname),
        async (route) => {
          if (route.request().method() === 'PUT') {
            await route.fulfill(fulfillJson({ item: { id: MI_POLICY_ID } }));
          } else {
            await route.fallback();
          }
        }
      );

      const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
      await expect(deployButton).toBeEnabled();
      await deployButton.click();

      const body = JSON.parse((await policyPut).postData() ?? '{}');
      expect(body.vars.access_key_id).toStrictEqual(ACCESS_KEY_REF);
      expect(body.vars.secret_access_key).toBe('NEW-SECRET-VALUE');
    });

    test('emptying a replaced field clears the changed state', async ({ browserAuth, page }) => {
      await resume(browserAuth, page);

      await replaceSecretKey(page, 'typed');
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('');
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
    });
  }
);
