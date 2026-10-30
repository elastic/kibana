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

// Packages the service matrix fetches next to `aws`. Their manifests change the matrix, which
// reruns the drift check, so the tests answer them immediately and wait for every one.
const MATRIX_PACKAGES = [
  'aws',
  'aws_bedrock',
  'aws_bedrock_agentcore',
  'awsfargate',
  'aws_mq',
  'aws_logs',
  'aws_cloudwatch_input_otel',
  'aws_securityhub',
  'aws_billing',
  'amazon_security_lake',
];
const matrixPackageUrl = (name: string) => new RegExp(`/api/fleet/epm/packages/${name}(/[^/]+)?$`);

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
      // Secondary package manifests answer immediately with an empty package (`aws` is mocked by
      // mockCommonRoutes), so the matrix is final as soon as every response has arrived.
      await page.route(
        (url) => MATRIX_PACKAGES.slice(1).some((name) => matrixPackageUrl(name).test(url.pathname)),
        (route) =>
          route.fulfill(
            fulfillJson({ item: { version: '1.0.0', policy_templates: [], data_streams: [] } })
          )
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
      const matrixResponses = MATRIX_PACKAGES.map((name) =>
        page.waitForResponse((resp) => matrixPackageUrl(name).test(new URL(resp.url()).pathname))
      );
      await page.reload();
      await Promise.all(matrixResponses);
      await expect(page.testSubj.locator('onboardingStep-authenticate-and-deploy')).toBeVisible();

      if (!drift) {
        // Every manifest the matrix depends on has answered; wait until the drift check it reruns
        // has stopped (read-only poll on our own counter).
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

    test('replacing the keys alone redeploys, sending the new values', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page, { drift: false });

      // The deployment is unchanged until the stored keys are replaced.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();

      // The keys are replaced as a set: a new secret only works with its own access key id.
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey-replace').click();
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeHidden();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeHidden();
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('NEW-SECRET-VALUE');
      // Half of the set is not a change yet: nothing is sent until both are entered.
      await expect(page.testSubj.locator('authenticateAndDeployStep-nextButton')).toBeEnabled();
      await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('NEW-ACCESS-KEY');

      // Replacing the keys is the only change, and it marks the deployment as changed.
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
      expect(body.vars.access_key_id).toBe('NEW-ACCESS-KEY');
      expect(body.vars.secret_access_key).toBe('NEW-SECRET-VALUE');
    });

    test('Keep the stored secrets goes back to the placeholders and clears the change', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page, { drift: false });

      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey-replace').click();
      await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('NEW-ACCESS-KEY');
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('NEW-SECRET-VALUE');
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

      await page.testSubj.locator('awsStaticKeysForm-cancelReplace').click();

      // Nothing is changed any more, so the deployment is done again and its section collapses.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeHidden();
      await expect(page.testSubj.locator('awsStaticKeysForm-cancelReplace')).toBeHidden();
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId')).toBeHidden();

      // Opened again, the stored secrets are back as placeholders, with nothing typed.
      await page.testSubj.locator('managedIntegrationsSection-headerButton').click();
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();
    });
  }
);
