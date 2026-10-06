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

const DRIFTED_SERVICE_VARS = {
  elb: {
    enabledDataStreams: ['elb_logs'],
    varsByDataStream: {
      elb_logs: {
        enabledInputs: ['aws-s3'],
        varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::drift-bucket' } },
      },
    },
  },
};

test.describe(
  'Onboarding resume with stored secrets — managed integrations, static keys',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    const DEP_ID = 'dep-stored-secrets-mi-001';
    let soGets = 0;

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
      // After a reload the drift check re-runs several times while the page settles, and the
      // section re-collapses on each settle. Counting its SO GETs tells the tests when it is done.
      soGets = 0;
      await page.route(soRoute(DEP_ID), (route) => {
        if (route.request().method() === 'GET') soGets++;
        return route.fallback();
      });
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
     *
     * By default the session carries a bucket the SO does not know about, so the service has
     * drifted and the section stays open. With `drift: false` the deployment is unchanged: the
     * section collapses once the drift check settles, and is opened here once that has happened.
     */
    async function resume(
      browserAuth: { loginAsAdmin: () => Promise<void> },
      page: ScoutPage,
      { drift = true }: { drift?: boolean } = {}
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
          value: {
            globalRegion: 'us-east-1',
            instances: [ELB_INSTANCE],
            serviceVars: drift ? DRIFTED_SERVICE_VARS : {},
          },
        },
      ]);
      soGets = 0;
      await page.reload();
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      if (!drift) {
        // Wait until the drift check has stopped re-running (read-only poll on our own counter).
        let lastSeen = -1;
        await expect
          .poll(
            async () => {
              const stable = soGets > 0 && soGets === lastSeen;
              lastSeen = soGets;
              return stable;
            },
            { intervals: [500], timeout: 20_000 }
          )
          .toBe(true);
        await expect(
          page.testSubj.locator('managedIntegrationsSection').getByText('Done')
        ).toBeVisible();
        await page.testSubj.locator('managedIntegrationsSection-headerButton').click();
        await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      }
    }

    test('shows the stored keys as placeholders, not inputs', async ({ browserAuth, page }) => {
      await resume(browserAuth, page);

      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId')).toBeHidden();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey')).toBeHidden();
    });

    test('a settings change redeploys without retyping and sends the stored refs back', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page);
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

    test('replacing the secret access key alone redeploys, sending the new value and keeping the access key id', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page, { drift: false });

      // The deployment is unchanged until a stored value is replaced.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();

      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey-replace').click();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeHidden();
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('NEW-SECRET-VALUE');
      // The stored access key id is untouched.
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();

      // Replacing the key is the only change, and it marks the deployment as changed.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeDisabled();

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
  }
);
