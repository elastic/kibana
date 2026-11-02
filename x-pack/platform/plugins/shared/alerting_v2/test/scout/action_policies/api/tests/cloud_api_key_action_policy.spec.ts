/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getActionPolicyUrl,
  getUpdateActionPolicyApiKeyUrl,
  testData,
} from '../fixtures';

const ACTION_POLICY_ID = 'cloud-api-key-policy';

// The organization-level key only exists in the Mock IdP UIAM setup, so this cannot run on MKI.
apiTest.describe(
  '[NON-MKI] Action policies written with a Cloud API key',
  { tag: '@local-serverless-observability_complete' },
  () => {
    const cloudApiKeyHeaders = {
      ...testData.COMMON_HEADERS,
      Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
    };
    let sessionHeaders: Record<string, string>;

    const createPolicyWithSession = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.put(getActionPolicyUrl(ACTION_POLICY_ID), {
        headers: sessionHeaders,
        body: buildCreateActionPolicyData({ name: 'created with a session' }),
      });
      expect(response).toHaveStatusCode(201);
      return response.body;
    };

    apiTest.beforeAll(async ({ samlAuth }) => {
      // Basic auth cannot mint the policy API key with UIAM, so seed with a user session.
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
      );
      sessionHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
    });

    apiTest('create: accepts a Cloud API key', async ({ apiClient }) => {
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: cloudApiKeyHeaders,
        body: buildCreateActionPolicyData({ name: 'created with a Cloud API key' }),
      });

      expect(response).toHaveStatusCode(201);

      const list = await apiClient.get(testData.ACTION_POLICY_API_PATH, {
        headers: sessionHeaders,
      });
      expect(list).toHaveStatusCode(200);
      expect(list.body.total).toBe(1);
    });

    apiTest(
      'upsert: accepts a Cloud API key when the policy does not exist',
      async ({ apiClient }) => {
        const response = await apiClient.put(getActionPolicyUrl(ACTION_POLICY_ID), {
          headers: cloudApiKeyHeaders,
          body: buildCreateActionPolicyData({ name: 'upserted with a Cloud API key' }),
        });

        expect(response).toHaveStatusCode(201);
        expect(response.body.name).toBe('upserted with a Cloud API key');
      }
    );

    apiTest('upsert: accepts a Cloud API key when replacing a policy', async ({ apiClient }) => {
      await createPolicyWithSession(apiClient);

      const response = await apiClient.put(getActionPolicyUrl(ACTION_POLICY_ID), {
        headers: cloudApiKeyHeaders,
        body: buildCreateActionPolicyData({ name: 'replaced with a Cloud API key' }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('replaced with a Cloud API key');
    });

    apiTest('update: accepts a Cloud API key', async ({ apiClient }) => {
      await createPolicyWithSession(apiClient);

      const response = await apiClient.patch(getActionPolicyUrl(ACTION_POLICY_ID), {
        headers: cloudApiKeyHeaders,
        body: { name: 'updated with a Cloud API key' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('updated with a Cloud API key');
    });

    apiTest('update API key: accepts a Cloud API key', async ({ apiClient }) => {
      const created = await createPolicyWithSession(apiClient);

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(ACTION_POLICY_ID), {
        headers: cloudApiKeyHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.updated_at).not.toBe(created.updated_at);
    });
  }
);
