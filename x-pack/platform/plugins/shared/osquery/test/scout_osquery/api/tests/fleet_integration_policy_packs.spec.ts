/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

/**
 * Fleet-packs wiring: creating an osquery pack bound to an agent policy makes
 * the pack surface in the Fleet wrapper's package-policy listing. Migrated
 * from `fleet_integration.spec.ts` test 2 per the
 * `osquery-scout-ui-post-review-hardening` change (Workstream A) — that test
 * never used `page` or `pageObjects`, so it was a misplaced API test in the
 * UI tree.
 */
apiTest.describe(
  'Fleet integration — pack surfacing in Fleet wrapper',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleSessionCredentials;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest(
      'creates a policy with an osquery pack and sees the pack in Fleet listing',
      async ({ apiClient, apiServices, kbnClient }) => {
        const policyName = `scout-upgrade-${Date.now()}`;
        const integrationName = `${policyName}-integration`;
        const packName = `scout-fleet-pack-${Date.now()}`;

        const adminHeaders = { ...testData.COMMON_HEADERS, ...adminCredentials.cookieHeader };

        // Fleet writes require admin (or Fleet-all); privileged API keys are not enough on serverless Security.
        const policyResponse = await apiClient.post(testData.API_PATHS.FLEET_AGENT_POLICIES, {
          headers: adminHeaders,
          body: {
            name: policyName,
            namespace: 'default',
            description: 'Scout Fleet integration test policy',
            monitoring_enabled: ['logs', 'metrics'],
          },
          responseType: 'json',
        });
        expect(policyResponse).toHaveStatusCode(200);
        const testPolicyId = policyResponse.body.item.id as string;

        const pkgResponse = await apiClient.post(testData.API_PATHS.FLEET_PACKAGE_POLICIES, {
          headers: adminHeaders,
          body: {
            name: integrationName,
            namespace: 'default',
            policy_ids: [testPolicyId],
            package: { name: 'osquery_manager', version: '' },
            inputs: {},
          },
          responseType: 'json',
        });
        expect(pkgResponse).toHaveStatusCode(200);
        const testPkgPolicyId = pkgResponse.body.item.id as string;

        // 3. Create an osquery pack bound to the new policy.
        let packId: string | undefined;
        try {
          const packResponse = await apiServices.osquery.packs.create({
            name: packName,
            enabled: true,
            description: 'scout fleet pack test',
            shards: {},
            policy_ids: [testPolicyId],
            queries: {
              q1: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' },
            },
          });
          packId = (packResponse.data as { data: { saved_object_id: string } }).data
            .saved_object_id;

          // 4. Read back via the Fleet wrapper — the policy should surface.
          const policies = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
          const items = (policies.data as { items: Array<{ name: string }> }).items;
          const matchingPolicy = items.find((p) => p.name === integrationName);
          expect(matchingPolicy).toBeDefined();
        } finally {
          if (packId) {
            await apiServices.osquery.packs.delete(packId);
          }

          await kbnClient.request({
            method: 'DELETE',
            path: `${testData.API_PATHS.FLEET_PACKAGE_POLICIES}/${testPkgPolicyId}`,
            headers: testData.COMMON_HEADERS,
            ignoreErrors: [404],
          });
          await kbnClient.request({
            method: 'POST',
            path: `${testData.API_PATHS.FLEET_AGENT_POLICIES}/delete`,
            headers: testData.COMMON_HEADERS,
            body: { agentPolicyId: testPolicyId, force: true },
            ignoreErrors: [404, 400],
          });
        }
      }
    );
  }
);
