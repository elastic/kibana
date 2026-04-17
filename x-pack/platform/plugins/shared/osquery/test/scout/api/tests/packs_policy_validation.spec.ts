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
    let packagePolicyId: string;
    const createdPackIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Get installed osquery_manager version (pre-installed as bundled package)
      const versionResponse = await kbnClient.request({
        method: 'GET',
        path: `${testData.API_PATHS.FLEET_EPM_PACKAGES}/osquery_manager`,
      });
      const integrationVersion = (versionResponse.data as Record<string, any>)?.item?.version;

      // Create a real agent policy to use as a valid policy_id
      const policyResponse = await kbnClient.request({
        method: 'POST',
        path: testData.API_PATHS.FLEET_AGENT_POLICIES,
        body: {
          name: `osquery-test-policy-${Date.now()}`,
          description: 'Test policy for osquery pack validation',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
        },
      });
      agentPolicyId = (policyResponse.data as Record<string, any>).item.id;

      // Add osquery_manager integration to the agent policy (required for pack association)
      const packagePolicyResponse = await kbnClient.request({
        method: 'POST',
        path: testData.API_PATHS.FLEET_PACKAGE_POLICIES,
        body: {
          policy_id: agentPolicyId,
          package: { name: 'osquery_manager', version: integrationVersion },
          name: `osquery-integration-${Date.now()}`,
          description: '',
          namespace: 'default',
          inputs: {
            'osquery_manager-osquery': { enabled: true, streams: {} },
          },
        },
      });
      packagePolicyId = (packagePolicyResponse.data as Record<string, any>).item.id;
    });

    apiTest.afterAll(async ({ kbnClient, apiServices }) => {
      for (const packId of createdPackIds) {
        await apiServices.osquery.packs.delete(packId);
      }

      // Clean up package policy
      if (packagePolicyId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${packagePolicyId}`,
          ignoreErrors: [404],
        });
      }

      // Clean up agent policy
      if (agentPolicyId) {
        await kbnClient.request({
          method: 'POST',
          path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}/delete`,
          body: { agentPolicyId },
          ignoreErrors: [404],
        });
      }
    });

    apiTest('strips duplicate policy IDs and returns 200', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
        body: testData.getMinimalPack({
          policy_ids: Array(1000).fill(agentPolicyId),
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
