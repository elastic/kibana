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
  useOnboardingFeatureFlag,
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
} from '../helpers/policy_updates';

test.describe(
  'Onboarding — agent-based add a service to the existing package policy',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    const DEP_ID = 'dep-policy-updates-ab-001';
    const AGENT_POLICY_ID = 'mock-agent-policy-id';

    test('the added service goes into the first package policy with a PUT, not a new POST', async ({
      browserAuth,
      page,
    }) => {
      await mockAwsPackage(page, TWO_SERVICE_AWS_PACKAGE);
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

      const created: Array<Record<string, any>> = [];
      const updated: Array<Record<string, any>> = [];
      await page.route(
        (url) => /\/api\/fleet\/package_policies$/.test(url.pathname),
        async (route) => {
          if (route.request().method() === 'POST') {
            created.push(JSON.parse(route.request().postData() ?? '{}'));
            await route.fulfill(fulfillJson({ item: { id: 'unexpected-new-policy' } }));
          } else {
            await route.fallback();
          }
        }
      );
      // The deployed package policy holds both keys as secret refs (full package policy shape).
      await page.route(
        (url) => new RegExp(`/api/fleet/package_policies/${AB_POLICY_ID}$`).test(url.pathname),
        async (route) => {
          if (route.request().method() === 'PUT') {
            updated.push(JSON.parse(route.request().postData() ?? '{}'));
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
          value: { globalRegion: 'us-east-1', instances: [ELB_INSTANCE], serviceVars: {} },
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

      // Add a second service of the same package, then continue with the stored keys.
      await backToServiceSettings(page, ['guardduty']);
      await continueToDeploy(page);
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      const nextButton = page.testSubj.locator('authenticateAndDeployStep-nextButton');
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      await expect.poll(() => updated.length).toBe(1);
      expect(created).toHaveLength(0);
      expect(updated[0].vars.access_key_id).toStrictEqual(ACCESS_KEY_REF);
      expect(updated[0].vars.secret_access_key).toStrictEqual(SECRET_KEY_REF);
      // Both services are enabled in the one policy; a disabled stub would not be a deployed service.
      expect(updated[0].inputs['elb-aws-s3'].enabled).toBe(true);
      expect(updated[0].inputs['guardduty-aws-s3'].enabled).toBe(true);
      // The agent policy the package policy runs on is kept.
      expect(updated[0].policy_ids).toStrictEqual([AGENT_POLICY_ID]);
    });
  }
);
