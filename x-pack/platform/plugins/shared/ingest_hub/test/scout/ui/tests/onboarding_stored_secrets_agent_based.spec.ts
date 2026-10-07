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
  AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
  DETECT_AND_REVIEW_SESSION_KEY,
} from '../helpers/onboarding';
import {
  ACCESS_KEY_REF,
  SECRET_KEY_REF,
  AB_POLICY_ID,
  ELB_INSTANCE,
  fulfillJson,
  mockCommonRoutes,
  mockDeploymentSo,
  seedSession,
  soItem,
} from '../helpers/stored_secrets';

test.describe(
  'Onboarding resume with stored secrets — agent-based, static keys',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    const DEP_ID = 'dep-stored-secrets-ab-001';

    test.beforeEach(async ({ page }) => {
      await mockCommonRoutes(page);
      await mockDeploymentSo(
        page,
        DEP_ID,
        soItem(DEP_ID, {
          mechanisms: ['agent_based'],
          policyIdsByInstance: { elb: AB_POLICY_ID },
          agentPolicyIds: ['mock-agent-policy-id'],
        })
      );
      // Keep the existing agent policy selectable so the seeded selection is preserved.
      await page.route(
        (url) => /\/api\/fleet\/agent_policies/.test(url.pathname),
        (route) =>
          route.fulfill(
            fulfillJson({
              items: [{ id: 'mock-agent-policy-id', name: 'Mock Agent Policy' }],
              total: 1,
              page: 1,
              perPage: 20,
            })
          )
      );
      // The deployed package policy holds both keys as secret refs (full package policy shape).
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
                policy_ids: ['mock-agent-policy-id'],
                vars: {
                  access_key_id: { value: ACCESS_KEY_REF },
                  secret_access_key: { value: SECRET_KEY_REF },
                },
              },
            })
          );
        }
      );
    });

    async function resume(browserAuth: { loginAsAdmin: () => Promise<void> }, page: ScoutPage) {
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
          value: { globalRegion: 'us-east-1', instances: [ELB_INSTANCE], serviceVars: {} },
        },
        {
          key: AUTHENTICATE_AND_DEPLOY_SESSION_KEY,
          value: {
            deploymentMethod: 'agent_based',
            agentHostsMode: 'existing',
            selectedAgentPolicyIds: ['mock-agent-policy-id'],
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
    }

    test('shows the stored keys and does not ask to re-enter credentials', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page);

      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await expect(page.testSubj.locator('awsStaticKeysForm-secretAccessKey-stored')).toBeVisible();
      await expect(
        page.testSubj.locator('agentBasedSection-resumeCredentialsCallout')
      ).toBeHidden();
    });

    test('replacing the stored keys makes Next redeploy with the new values', async ({
      browserAuth,
      page,
    }) => {
      await resume(browserAuth, page);

      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey-replace').click();
      await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('NEW-SECRET-VALUE');
      await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('NEW-ACCESS-KEY');
      // Nothing else changed, so only the replaced keys can make the step redeploy.
      await expect(page.testSubj.locator('authenticateAndDeployStep-driftCallout')).toBeVisible();

      const policyPut = page.waitForRequest(
        (req) =>
          req.method() === 'PUT' &&
          new RegExp(`/api/fleet/package_policies/${AB_POLICY_ID}$`).test(
            new URL(req.url()).pathname
          )
      );

      const nextButton = page.testSubj.locator('authenticateAndDeployStep-nextButton');
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      const body = JSON.parse((await policyPut).postData() ?? '{}');
      expect(body.vars.access_key_id).toBe('NEW-ACCESS-KEY');
      expect(body.vars.secret_access_key).toBe('NEW-SECRET-VALUE');
    });
  }
);
