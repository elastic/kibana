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
  getActionPolicyUrl,
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
apiTest.describe('Delete action policy API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest(
    'delete: deletes an action policy and returns 204',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'test-policy-for-delete',
          description: 'test-policy-for-delete description',
          destinations: [{ type: 'workflow', id: 'test-workflow-for-delete' }],
        })
      );

      const deleteResponse = await apiClient.delete(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });

      expect(deleteResponse).toHaveStatusCode(204);

      // Side-effect verification via the GET endpoint to confirm the policy is
      // actually gone. We use apiClient (not apiServices) here because the
      // service helpers throw on 4xx, which would obscure the assertion. This
      // GET is a verifier — it is not the endpoint under test.
      const getResponse = await apiClient.get(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });
      expect(getResponse).toHaveStatusCode(404);
    }
  );

  // ---------- not found / idempotency ----------

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.delete(getActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'idempotency: returns 404 on a second delete of the same policy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'idempotent-delete-policy' })
      );

      const firstDelete = await apiClient.delete(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });
      expect(firstDelete).toHaveStatusCode(204);

      const secondDelete = await apiClient.delete(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      });
      expect(secondDelete).toHaveStatusCode(404);
    }
  );

  // ---------- schema validation ----------

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.delete(getActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
    });

    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest(
    'authorization: 204 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-delete' })
      );

      const response = await apiClient.delete(getActionPolicyUrl(created.id), {
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
        buildCreateActionPolicyData({ name: 'reader-cannot-delete' })
      );

      const response = await apiClient.delete(getActionPolicyUrl(created.id), {
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
        buildCreateActionPolicyData({ name: 'no-access-cannot-delete' })
      );

      const response = await apiClient.delete(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
