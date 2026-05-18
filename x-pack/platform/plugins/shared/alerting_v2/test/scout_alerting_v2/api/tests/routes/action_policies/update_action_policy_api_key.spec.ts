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
  ALL_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getUpdateActionPolicyApiKeyUrl,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../../../fixtures';

/*
 * Custom-role auth (`requestAuth.getApiKeyForCustomRole`) is not yet supported
 * on Elastic Cloud Hosted — ECH falls back to `viewer` for unsupported custom
 * roles, which would silently turn 403 assertions into false positives. This
 * suite is restricted to local stateful (classic) until ECH support lands.
 */
apiTest.describe('Update action policy API key API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  // ---------- happy path ----------

  apiTest('update: rotates the API key and returns 204', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'api-key-update-policy',
        description: 'api-key-update-policy description',
        destinations: [{ type: 'workflow', id: 'api-key-workflow-id' }],
      })
    );

    const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
    });

    expect(response).toHaveStatusCode(204);

    // The new API key is server-side only and never returned. We verify the
    // rotation indirectly: the SO was rewritten, so `version` and
    // `updatedAt` must change. Direct verification of apiKeyService.create /
    // markApiKeysForInvalidation lives in action_policy_client unit tests.
    const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
    expect(fetched.updatedAt).not.toBe(created.createdAt);
    expect(fetched.version).not.toBe(created.version);
  });

  // ---------- state preservation ----------

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
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });

      expect(response).toHaveStatusCode(204);

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.name).toBe('preserve-attrs-policy');
      expect(fetched.description).toBe('preserve-attrs-policy description');
      expect(fetched.destinations).toStrictEqual([
        { type: 'workflow', id: 'preserve-workflow-id' },
      ]);
      expect(fetched.matcher).toBe("env == 'production' && region == 'us-east-1'");
      expect(fetched.groupBy).toStrictEqual(['service.name']);
      expect(fetched.throttle).toStrictEqual({ interval: '5m' });
      expect(fetched.enabled).toBe(true);
    }
  );

  // ---------- idempotency ----------

  apiTest(
    'idempotency: rotating an already-rotated API key still returns 204',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'rotate-twice-policy' })
      );

      const firstRotate = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });
      expect(firstRotate).toHaveStatusCode(204);

      const secondRotate = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });
      expect(secondRotate).toHaveStatusCode(204);
    }
  );

  // ---------- not found ----------

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
    });

    expect(response).toHaveStatusCode(404);
  });

  // ---------- schema validation ----------

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(
      getUpdateActionPolicyApiKeyUrl('a'.repeat(ID_MAX_LENGTH + 1)),
      {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      }
    );

    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest(
    'authorization: 204 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-rotate' })
      );

      const response = await apiClient.post(getUpdateActionPolicyApiKeyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(204);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
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
