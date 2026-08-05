/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH, MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getBulkEnableActionPoliciesUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Bulk enable action policies API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('enable: enables disabled policies', async ({ apiClient, apiServices }) => {
    const p1 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-enable-1' })
    );
    const p2 = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'bulk-enable-2' })
    );
    await apiServices.alertingV2.actionPolicies.disable(p1.id);
    await apiServices.alertingV2.actionPolicies.disable(p2.id);

    const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [p1.id, p2.id] },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.affected_count).toBe(2);
    expect(response.body.errors).toStrictEqual([]);

    const updated1 = await apiServices.alertingV2.actionPolicies.get(p1.id);
    const updated2 = await apiServices.alertingV2.actionPolicies.get(p2.id);
    expect(updated1.enabled).toBe(true);
    expect(updated2.enabled).toBe(true);
  });

  apiTest(
    'enable: reports a per-item error for a non-existent id',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'bulk-enable-partial' })
      );

      const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: [existing.id, 'non-existent-id'] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('non-existent-id');
      expect(response.body.errors[0].error.code).toBe('ACTION_POLICY_NOT_FOUND');
    }
  );

  apiTest('validation: rejects an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects a body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: ['some-id'], unknownField: 'x' },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects an empty id', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: [''] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects an id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: ['a'.repeat(ID_MAX_LENGTH + 1)] },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects more than the maximum number of ids', async ({ apiClient }) => {
    const tooManyIds = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);

    const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { ids: tooManyIds },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-bulk-enable' })
      );

      const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-bulk-enable' })
      );

      const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-bulk-enable' })
      );

      const response = await apiClient.post(getBulkEnableActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
