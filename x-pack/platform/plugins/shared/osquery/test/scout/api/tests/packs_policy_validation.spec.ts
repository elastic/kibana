/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Osquery packs - policy ID validation',
  {
    tag: ['@local-stateful-classic', ...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let agentPolicyId: string;
    const createdPackIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Create a real agent policy to use as a valid policy_id
      const policyResponse = await apiClient.post('api/fleet/agent_policies', {
        headers: {
          ...testData.COMMON_HEADERS,
          'elastic-api-version': testData.OSQUERY_API_VERSION,
          ...adminCredentials.cookieHeader,
        },
        body: {
          name: `osquery-test-policy-${Date.now()}`,
          description: 'Test policy for osquery pack validation',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
        },
        responseType: 'json',
      });
      expect(policyResponse).toHaveStatusCode(200);
      agentPolicyId = policyResponse.body.item.id;
    });

    apiTest.afterAll(async ({ apiClient, apiServices }) => {
      for (const packId of createdPackIds) {
        await apiServices.osquery.packs.delete(packId);
      }

      // Clean up agent policy
      if (agentPolicyId) {
        await apiClient.post('api/fleet/agent_policies/delete', {
          headers: {
            ...testData.COMMON_HEADERS,
            'elastic-api-version': testData.OSQUERY_API_VERSION,
            ...adminCredentials.cookieHeader,
          },
          body: { agentPolicyId },
        });
      }
    });

    apiTest('strips duplicate policy IDs and returns 200', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalPack({
          policy_ids: Array(100).fill(agentPolicyId),
        }),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      const packId = createResponse.body.data.saved_object_id;
      createdPackIds.push(packId);

      const readResponse = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        responseType: 'json',
      });
      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body.data.policy_ids).toHaveLength(1);
      expect(readResponse.body.data.policy_ids[0]).toBe(agentPolicyId);
    });

    apiTest('returns 400 for a single non-existent policy ID', async ({ apiClient }) => {
      const nonExistentId = 'non-existent-policy-id';
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalPack({ policy_ids: [nonExistentId] }),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain(nonExistentId);
    });

    apiTest('returns 400 for mixed valid and invalid policy IDs', async ({ apiClient }) => {
      const nonExistentId = 'non-existent-policy-id';
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalPack({
          policy_ids: [agentPolicyId, nonExistentId],
        }),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain(nonExistentId);
    });
  }
);
