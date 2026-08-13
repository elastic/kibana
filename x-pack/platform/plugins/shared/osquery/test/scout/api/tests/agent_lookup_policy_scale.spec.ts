/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scale regression test for the agent picker HTTP 414/431 bug (#266739).
 *
 * Pre-fix: the client serialized all osquery policy IDs into the GET URL, which
 * exceeds Node's default 16 KB header limit at ~200 policies (Kibana returns 431).
 * Post-fix: the server scopes agents itself; the request URL is ~200 bytes regardless
 * of policy count, so the request always succeeds.
 *
 * This test provisions just above the ~200-policy rejection threshold using real Fleet
 * agent policies and real osquery_manager package policies. No Elastic Agent enrollment
 * is required; the picker's scoping correctness (groups.policies) is the assertion target.
 *
 * Tags:
 * - @local-stateful-classic: runs locally and in CI stateful classic tier
 * - serverless security complete: runs in the full serverless security tier
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

// Just above the ~200-policy Node maxHeaderSize rejection threshold.
// Chosen to minimise provisioning time while still crossing the line.
const POLICY_COUNT = 205;

// Approximate per-policy URL cost that the pre-fix client incurred.
// buildPolicyIdKuery emits: `"<id>" or <id>#*` (~80 chars for a UUID-shaped id).
// Used only to assert the pre-fix URL would have exceeded the header limit.
const APPROX_CHARS_PER_POLICY = 80;

apiTest.describe(
  'Osquery agent lookup - policy scale regression (#266739)',
  {
    tag: ['@local-stateful-classic', ...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let integrationVersion: string;
    const createdAgentPolicyIds: string[] = [];
    const createdPackagePolicyIds: string[] = [];
    // One extra policy WITHOUT the osquery integration — must not appear in groups.policies
    let noOsqueryPolicyId: string;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Resolve the installed osquery_manager version (bundled, always present)
      const versionResponse = await kbnClient.request({
        method: 'GET',
        path: `${testData.API_PATHS.FLEET_EPM_PACKAGES}/osquery_manager`,
      });
      integrationVersion = (versionResponse.data as Record<string, any>)?.item?.version;

      // Create a non-osquery agent policy (scoping exclusion check)
      const noOsqueryResponse = await kbnClient.request({
        method: 'POST',
        path: testData.API_PATHS.FLEET_AGENT_POLICIES,
        body: {
          name: `osquery-scale-test-no-integration-${Date.now()}`,
          namespace: 'default',
        },
      });
      noOsqueryPolicyId = (noOsqueryResponse.data as Record<string, any>).item.id;

      // Provision POLICY_COUNT agent policies concurrently, each with an osquery_manager package policy.
      // Batch in groups of 20 to avoid overwhelming the Fleet API.
      const BATCH_SIZE = 20;
      for (let batch = 0; batch < Math.ceil(POLICY_COUNT / BATCH_SIZE); batch++) {
        const start = batch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, POLICY_COUNT);
        await Promise.all(
          Array.from({ length: end - start }, async (_, i) => {
            const idx = start + i;
            const policyResponse = await kbnClient.request({
              method: 'POST',
              path: testData.API_PATHS.FLEET_AGENT_POLICIES,
              body: {
                name: `osquery-scale-test-${Date.now()}-${idx}`,
                namespace: 'default',
              },
            });
            const agentPolicyId = (policyResponse.data as Record<string, any>).item.id;
            createdAgentPolicyIds.push(agentPolicyId);

            const pkgPolicyResponse = await kbnClient.request({
              method: 'POST',
              path: testData.API_PATHS.FLEET_PACKAGE_POLICIES,
              body: {
                policy_id: agentPolicyId,
                package: { name: 'osquery_manager', version: integrationVersion },
                name: `osquery-scale-pkg-${Date.now()}-${idx}`,
                namespace: 'default',
                inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
              },
            });
            const pkgPolicyId = (pkgPolicyResponse.data as Record<string, any>).item.id;
            createdPackagePolicyIds.push(pkgPolicyId);
          })
        );
      }
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      // Delete package policies first (they reference agent policies)
      await Promise.all(
        createdPackagePolicyIds.map((id) =>
          kbnClient
            .request({
              method: 'DELETE',
              path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${id}`,
              ignoreErrors: [404],
            })
            .catch(() => {})
        )
      );

      // Delete agent policies
      await Promise.all(
        [...createdAgentPolicyIds, noOsqueryPolicyId].filter(Boolean).map((id) =>
          kbnClient
            .request({
              method: 'POST',
              path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}/delete`,
              body: { agentPolicyId: id },
              ignoreErrors: [404],
            })
            .catch(() => {})
        )
      );
    });

    apiTest(
      'fixed request (no policy IDs in URL) succeeds and returns scoped groups; pre-fix URL would have exceeded header limit',
      async ({ apiClient }) => {
        // Before-state evidence: approximate what the pre-fix client would have sent
        const prefixBase = 'internal/osquery/fleet_wrapper/agents?perPage=9000&kuery=policy_id:(';
        const approximatePreFixUrlLength =
          prefixBase.length + createdAgentPolicyIds.length * APPROX_CHARS_PER_POLICY;
        // Must exceed Node's default 16 KB header limit — this is what caused 431/414
        expect(approximatePreFixUrlLength).toBeGreaterThan(16 * 1024);

        // Post-fix: client sends no policy IDs; scoping is enforced server-side
        const response = await apiClient.get('internal/osquery/fleet_wrapper/agents?perPage=9000', {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as {
          total: number;
          agents: unknown[];
          groups: { policies: Array<{ id: string }> };
        };

        // No Elastic Agent enrolled — total is 0, but groups.policies should list the created policies
        expect(body.total).toBe(0);
        expect(body.agents).toHaveLength(0);
        // The server scoped correctly: all POLICY_COUNT created policies should appear
        expect(body.groups.policies).toHaveLength(POLICY_COUNT);
      }
    );

    apiTest(
      'scoping is enforced: non-osquery policy does not appear in groups.policies',
      async ({ apiClient }) => {
        const response = await apiClient.get('internal/osquery/fleet_wrapper/agents?perPage=9000', {
          headers: { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as {
          groups: { policies: Array<{ id: string }> };
        };
        const returnedPolicyIds = body.groups.policies.map((p) => p.id);
        expect(returnedPolicyIds).not.toContain(noOsqueryPolicyId);
      }
    );
  }
);
