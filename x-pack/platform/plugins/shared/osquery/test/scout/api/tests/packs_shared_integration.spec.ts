/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const AGENT_POLICIES_ROUTE = 'internal/osquery/fleet_wrapper/agent_policies';

// Creating a package policy with several `policy_ids` needs an Enterprise (trial) license,
// which the default stateful Scout config provides. Serverless tiers are not covered here.
apiTest.describe(
  'Osquery packs - shared integration targeting',
  { tag: ['@local-stateful-classic'] },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let policyA: string;
    let policyB: string;
    let policyD: string;
    let sharedPackagePolicyId: string;
    let dedicatedPackagePolicyId: string;
    let partialPackId: string;
    const createdPackIds: string[] = [];
    const createdAgentPolicyIds: string[] = [];
    const suffix = Date.now();

    const headers = () => ({ ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader });

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      const versionResponse = await kbnClient.request({
        method: 'GET',
        path: `${testData.API_PATHS.FLEET_EPM_PACKAGES}/osquery_manager`,
      });
      const version = (versionResponse.data as Record<string, any>)?.item?.version;

      const createAgentPolicy = async (name: string) => {
        const res = await kbnClient.request({
          method: 'POST',
          path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}?sys_monitoring=false`,
          body: { name: `${name}-${suffix}`, namespace: 'default' },
        });
        const id = (res.data as Record<string, any>).item.id as string;
        createdAgentPolicyIds.push(id);

        return id;
      };

      const createPackagePolicy = async (name: string, policyIds: string[]) => {
        const res = await kbnClient.request({
          method: 'POST',
          path: testData.API_PATHS.FLEET_PACKAGE_POLICIES,
          body: {
            name: `${name}-${suffix}`,
            description: '',
            namespace: 'default',
            policy_ids: policyIds,
            package: { name: 'osquery_manager', version },
            inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
          },
        });

        return (res.data as Record<string, any>).item.id as string;
      };

      policyA = await createAgentPolicy('e2e-shared-a');
      policyB = await createAgentPolicy('e2e-shared-b');
      policyD = await createAgentPolicy('e2e-dedicated');
      sharedPackagePolicyId = await createPackagePolicy('e2e-shared-osquery', [policyA, policyB]);
      dedicatedPackagePolicyId = await createPackagePolicy('e2e-dedicated-osquery', [policyD]);
    });

    apiTest.afterAll(async ({ kbnClient, apiServices }) => {
      for (const packId of createdPackIds) {
        await apiServices.osquery.packs.delete(packId);
      }

      for (const id of [sharedPackagePolicyId, dedicatedPackagePolicyId]) {
        if (id) {
          await kbnClient.request({
            method: 'DELETE',
            path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${id}`,
            ignoreErrors: [404],
          });
        }
      }

      for (const agentPolicyId of createdAgentPolicyIds) {
        await kbnClient.request({
          method: 'POST',
          path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}/delete`,
          body: { agentPolicyId },
          ignoreErrors: [404],
        });
      }
    });

    apiTest('warns when a shared integration is only partially selected', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: headers(),
        body: testData.getMinimalPack({ name: `e2e-partial-${suffix}`, policy_ids: [policyA] }),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      partialPackId = response.body.data.saved_object_id;
      createdPackIds.push(partialPackId);

      expect(response.body.data.policy_ids).toStrictEqual([policyA]);
      expect(response.body.warnings).toHaveLength(1);
      expect(response.body.warnings[0]).toMatchObject({
        code: 'shared_integration_overdelivery',
        package_policy_id: sharedPackagePolicyId,
        additional_policy_ids: [policyB],
      });
    });

    apiTest('reads effective agent policies from live package policies', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${partialPackId}`, {
        headers: headers(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect([...response.body.data.effective_policy_ids].sort()).toStrictEqual(
        [policyA, policyB].sort()
      );
    });

    apiTest(
      'returns no warnings when the whole shared integration is selected',
      async ({ apiClient }) => {
        const response = await apiClient.put(
          `${testData.API_PATHS.OSQUERY_PACKS}/${partialPackId}`,
          {
            headers: headers(),
            body: { policy_ids: [policyA, policyB] },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.warnings ?? []).toHaveLength(0);
      }
    );

    apiTest('returns no warnings for a dedicated integration', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: headers(),
        body: testData.getMinimalPack({ name: `e2e-dedicated-${suffix}`, policy_ids: [policyD] }),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      createdPackIds.push(response.body.data.saved_object_id);
      expect(response.body.warnings ?? []).toHaveLength(0);
    });

    apiTest('exposes the owning package policy on shared agent policies', async ({ apiClient }) => {
      const response = await apiClient.get(AGENT_POLICIES_ROUTE, {
        // Internal route: versioned as '1', not the public OSQUERY_API_VERSION from COMMON_HEADERS.
        headers: { ...headers(), 'elastic-api-version': '1' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const items = response.body as Array<{
        id: string;
        package_policy_id?: string;
        package_policy_name?: string;
      }>;
      const a = items.find((item) => item.id === policyA);
      const b = items.find((item) => item.id === policyB);
      const d = items.find((item) => item.id === policyD);

      expect(a?.package_policy_id).toBe(sharedPackagePolicyId);
      expect(b?.package_policy_id).toBe(sharedPackagePolicyId);
      expect(d?.package_policy_id).toBe(dedicatedPackagePolicyId);
    });

    apiTest('warns only once a disabled partial pack is enabled', async ({ apiClient }) => {
      const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
        headers: headers(),
        body: testData.getMinimalPack({
          name: `e2e-disabled-partial-${suffix}`,
          enabled: false,
          policy_ids: [policyA],
        }),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      const packId = createResponse.body.data.saved_object_id;
      createdPackIds.push(packId);
      expect(createResponse.body.warnings ?? []).toHaveLength(0);

      const enableResponse = await apiClient.put(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
        headers: headers(),
        body: { enabled: true },
        responseType: 'json',
      });
      expect(enableResponse).toHaveStatusCode(200);
      expect(enableResponse.body.data.policy_ids).toStrictEqual([policyA]);
      expect(enableResponse.body.warnings).toHaveLength(1);
      expect(enableResponse.body.warnings[0]).toMatchObject({
        code: 'shared_integration_overdelivery',
        package_policy_id: sharedPackagePolicyId,
        additional_policy_ids: [policyB],
      });
    });

    apiTest('lists effective agent policies for each pack', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_PATHS.OSQUERY_PACKS}?search=${suffix}&pageSize=100`,
        { headers: headers(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const items = response.body.data as Array<{
        saved_object_id: string;
        policy_ids: string[];
        effective_policy_ids?: string[];
      }>;
      const partial = items.find((item) => item.saved_object_id === partialPackId);
      expect(partial?.policy_ids).toStrictEqual([policyA, policyB]);
      expect([...(partial?.effective_policy_ids ?? [])].sort()).toStrictEqual(
        [policyA, policyB].sort()
      );
    });

    // Runs last: it attaches another agent policy to the shared integration.
    apiTest(
      'reports agent policies attached to the shared integration later as effective only',
      async ({ apiClient, kbnClient }) => {
        const policyRes = await kbnClient.request({
          method: 'POST',
          path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}?sys_monitoring=false`,
          body: { name: `e2e-shared-c-${suffix}`, namespace: 'default' },
        });
        const policyC = (policyRes.data as Record<string, any>).item.id as string;
        createdAgentPolicyIds.push(policyC);

        const sharedRes = await kbnClient.request({
          method: 'GET',
          path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${sharedPackagePolicyId}`,
        });
        const sharedPackage = (sharedRes.data as Record<string, any>).item.package;
        await kbnClient.request({
          method: 'PUT',
          path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${sharedPackagePolicyId}`,
          body: {
            policy_ids: [policyA, policyB, policyC],
            package: { name: sharedPackage.name, version: sharedPackage.version },
          },
        });

        const response = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}/${partialPackId}`,
          { headers: headers(), responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.data.policy_ids).toStrictEqual([policyA, policyB]);
        expect([...response.body.data.effective_policy_ids].sort()).toStrictEqual(
          [policyA, policyB, policyC].sort()
        );
      }
    );
  }
);
