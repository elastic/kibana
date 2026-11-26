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

interface PackListItem {
  name: string;
  saved_object_id: string;
  policy_ids: string[];
  effective_policy_ids?: string[];
}

// Creating a package policy with several `policy_ids` needs an Enterprise (trial) license,
// which the default stateful Scout config provides. Serverless tiers are not covered here.
// Every test creates what it reads, so any test can run on its own (e.g. with --grep).
apiTest.describe(
  'Osquery packs - shared integration targeting',
  { tag: ['@local-stateful-classic'] },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let packageVersion: string;
    let policyA: string;
    let policyB: string;
    let policyD: string;
    let sharedPackagePolicyId: string;
    let dedicatedPackagePolicyId: string;
    const createdPackagePolicyIds: string[] = [];
    const createdAgentPolicyIds: string[] = [];
    const suffix = Date.now();

    const headers = () => ({ ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader });

    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
      packageVersion = (await apiServices.fleet.integration.getPackage('osquery_manager')).data.item
        .version;

      const createAgentPolicy = async (name: string) => {
        const res = await apiServices.fleet.agent_policies.create({
          policyName: `${name}-${suffix}`,
          policyNamespace: 'default',
          sysMonitoring: false,
        });
        const id = res.data.item.id as string;
        createdAgentPolicyIds.push(id);

        return id;
      };

      const createPackagePolicy = async (name: string, policyIds: string[]) => {
        const res = await apiServices.fleet.package_policies.create({
          name: `${name}-${suffix}`,
          description: '',
          namespace: 'default',
          policy_ids: policyIds,
          package: { name: 'osquery_manager', version: packageVersion },
          inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
        });
        const id = res.data.item.id as string;
        createdPackagePolicyIds.push(id);

        return id;
      };

      policyA = await createAgentPolicy('e2e-shared-a');
      policyB = await createAgentPolicy('e2e-shared-b');
      policyD = await createAgentPolicy('e2e-dedicated');
      sharedPackagePolicyId = await createPackagePolicy('e2e-shared-osquery', [policyA, policyB]);
      dedicatedPackagePolicyId = await createPackagePolicy('e2e-dedicated-osquery', [policyD]);
    });

    apiTest.afterAll(async ({ kbnClient, apiServices }) => {
      // Attempt every cleanup (packs → integrations → agent policies) even if one fails,
      // so a single error does not leave the remaining fixtures on the shared stack.
      const failures: unknown[] = [];
      const attempt = async (cleanup: () => Promise<unknown>) => {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
        }
      };

      // Find packs by the run suffix rather than by ids collected from responses, so a
      // pack saved before a failed Fleet write (non-200 create) is cleaned up too.
      await attempt(async () => {
        const res = await kbnClient.request({
          method: 'GET',
          path: `/${testData.API_PATHS.OSQUERY_PACKS}`,
          headers: { 'elastic-api-version': testData.COMMON_HEADERS['elastic-api-version'] },
          query: { search: String(suffix), pageSize: 100 },
        });
        for (const { saved_object_id: packId } of (res.data as { data: PackListItem[] }).data) {
          await attempt(() => apiServices.osquery.packs.delete(packId));
        }
      });

      for (const id of createdPackagePolicyIds) {
        await attempt(() => apiServices.fleet.package_policies.delete(id));
      }

      for (const id of createdAgentPolicyIds) {
        await attempt(() => apiServices.fleet.agent_policies.delete(id));
      }

      if (failures.length) {
        throw new AggregateError(failures, `${failures.length} cleanup step(s) failed`);
      }
    });

    apiTest(
      'warns on a partial shared selection and reports effective targets on opt-in',
      async ({ apiClient }) => {
        const name = `e2e-partial-${suffix}`;
        let packId = '';

        await apiTest.step('create on A only: saved [A], warning names B', async () => {
          const response = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
            headers: headers(),
            body: testData.getMinimalPack({ name, policy_ids: [policyA] }),
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          packId = response.body.data.saved_object_id;
          expect(response.body.data.policy_ids).toStrictEqual([policyA]);
          expect(response.body.warnings).toHaveLength(1);
          expect(response.body.warnings[0]).toMatchObject({
            code: 'shared_integration_overdelivery',
            package_policy_id: sharedPackagePolicyId,
            additional_policy_ids: [policyB],
          });
        });

        await apiTest.step('read without opt-in omits effective_policy_ids', async () => {
          const response = await apiClient.get(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
            headers: headers(),
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body.data.effective_policy_ids).toBeUndefined();
        });

        await apiTest.step('read with opt-in reports A and B as effective', async () => {
          const response = await apiClient.get(
            `${testData.API_PATHS.OSQUERY_PACKS}/${packId}?withEffectivePolicyIds=true`,
            { headers: headers(), responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          expect(response.body.data.policy_ids).toStrictEqual([policyA]);
          expect([...response.body.data.effective_policy_ids].sort()).toStrictEqual(
            [policyA, policyB].sort()
          );
        });

        await apiTest.step('list with opt-in tells saved [A] from effective [A, B]', async () => {
          const response = await apiClient.get(
            `${testData.API_PATHS.OSQUERY_PACKS}?search=${suffix}&pageSize=100&withEffectivePolicyIds=true`,
            { headers: headers(), responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          const pack = (response.body.data as PackListItem[]).find((item) => item.name === name);
          expect(pack?.policy_ids).toStrictEqual([policyA]);
          expect([...(pack?.effective_policy_ids ?? [])].sort()).toStrictEqual(
            [policyA, policyB].sort()
          );
        });

        await apiTest.step('selecting the whole integration returns no warning', async () => {
          const response = await apiClient.put(`${testData.API_PATHS.OSQUERY_PACKS}/${packId}`, {
            headers: headers(),
            body: { policy_ids: [policyA, policyB] },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body.warnings ?? []).toHaveLength(0);
        });
      }
    );

    apiTest(
      'returns no warnings and matching targets for a dedicated integration',
      async ({ apiClient }) => {
        const name = `e2e-dedicated-${suffix}`;
        const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
          headers: headers(),
          body: testData.getMinimalPack({ name, policy_ids: [policyD] }),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body.warnings ?? []).toHaveLength(0);

        const listResponse = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}?search=${suffix}&pageSize=100&withEffectivePolicyIds=true`,
          { headers: headers(), responseType: 'json' }
        );
        expect(listResponse).toHaveStatusCode(200);
        const pack = (listResponse.body.data as PackListItem[]).find((item) => item.name === name);
        expect(pack?.policy_ids).toStrictEqual([policyD]);
        expect(pack?.effective_policy_ids).toStrictEqual([policyD]);
      }
    );

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

    apiTest(
      'reports agent policies attached to a shared integration later as effective only',
      async ({ apiClient, apiServices, kbnClient }) => {
        // Its own integration, so attaching another agent policy does not affect other tests.
        const createAgentPolicy = async (policyName: string) => {
          const res = await apiServices.fleet.agent_policies.create({
            policyName: `${policyName}-${suffix}`,
            policyNamespace: 'default',
            sysMonitoring: false,
          });
          const id = res.data.item.id as string;
          createdAgentPolicyIds.push(id);

          return id;
        };

        const policyE = await createAgentPolicy('e2e-later-e');
        const policyF = await createAgentPolicy('e2e-later-f');
        const policyG = await createAgentPolicy('e2e-later-g');
        const integrationRes = await apiServices.fleet.package_policies.create({
          name: `e2e-later-osquery-${suffix}`,
          description: '',
          namespace: 'default',
          policy_ids: [policyE, policyF],
          package: { name: 'osquery_manager', version: packageVersion },
          inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
        });
        const laterPackagePolicyId = integrationRes.data.item.id as string;
        createdPackagePolicyIds.push(laterPackagePolicyId);

        const createResponse = await apiClient.post(testData.API_PATHS.OSQUERY_PACKS, {
          headers: headers(),
          body: testData.getMinimalPack({ name: `e2e-later-${suffix}`, policy_ids: [policyE] }),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const packId = createResponse.body.data.saved_object_id;

        // Fleet's update API is the only way to attach an agent policy to an integration.
        await kbnClient.request({
          method: 'PUT',
          path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${laterPackagePolicyId}`,
          body: {
            policy_ids: [policyE, policyF, policyG],
            package: { name: 'osquery_manager', version: packageVersion },
          },
        });

        const response = await apiClient.get(
          `${testData.API_PATHS.OSQUERY_PACKS}/${packId}?withEffectivePolicyIds=true`,
          { headers: headers(), responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.data.policy_ids).toStrictEqual([policyE]);
        expect([...response.body.data.effective_policy_ids].sort()).toStrictEqual(
          [policyE, policyF, policyG].sort()
        );
      }
    );
  }
);
