/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getUpdateActionPolicyApiKeyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Update action policy API key API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_ALL_ROLE
    );
    writerHeaders = { ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest('update: rotates the API key and returns 204', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'api-key-update-policy',
        description: 'api-key-update-policy description',
        destinations: [{ type: 'workflow', id: 'api-key-workflow-id' }],
      })
    );

    const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
    });

    expect(response).toHaveStatusCode(204);

    const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
    expect(fetched.updatedAt).not.toBe(created.createdAt);
    expect(fetched.version).not.toBe(created.version);
  });

  apiTest(
    'state: preserves all policy attributes after rotating the API key',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'preserve-attrs-policy',
          description: 'preserve-attrs-policy description',
          destinations: [{ type: 'workflow', id: 'preserve-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        })
      );

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(204);

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched).toStrictEqual({
        ...created,
        updatedAt: fetched.updatedAt,
        updatedBy: fetched.updatedBy,
        version: fetched.version,
        auth: fetched.auth,
      });
      expect(Date.parse(fetched.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
      expect(fetched.version).not.toBe(created.version);
    }
  );

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ACTION_POLICY_NOT_FOUND');
  });

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(
      getUpdateActionPolicyApiKeyUrl('a'.repeat(ID_MAX_LENGTH + 1)),
      {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      }
    );

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 204 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-rotate' })
      );

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      });

      expect(response).toHaveStatusCode(204);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-rotate' })
      );

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-cannot-rotate' })
      );

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
