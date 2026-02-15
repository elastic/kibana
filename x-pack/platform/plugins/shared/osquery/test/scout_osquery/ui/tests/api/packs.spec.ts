/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { socManagerRole } from '../../common/roles';
import {
  loadAgentPolicy,
  addOsqueryToAgentPolicy,
  cleanupAgentPolicy,
  cleanupPack,
  getPack,
} from '../../common/api_helpers';

test.describe(
  'Packs',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let policyId: string;

    test.beforeEach(async ({ kbnClient, browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      const agentPolicy = await loadAgentPolicy(kbnClient);
      policyId = agentPolicy.id;
      await addOsqueryToAgentPolicy(kbnClient, policyId, agentPolicy.name);
    });

    test.afterEach(async ({ kbnClient }) => {
      await cleanupAgentPolicy(kbnClient, policyId);
    });

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe('Duplicate policy ids', () => {
      let packId: string;

      test.beforeEach(async ({ kbnClient }) => {
        const { data } = await kbnClient.request({
          method: 'POST',
          path: '/api/osquery/packs',
          body: {
            name: `test-pack-${Date.now()}`,
            policy_ids: Array(1000).fill(policyId),
            queries: {
              test: {
                ecs_mapping: {},
                interval: 3600,
                query: 'select * from uptime;',
              },
            },
            enabled: true,
            shards: {},
          },
        });
        packId = (data as any).data.saved_object_id;
      });

      test.afterEach(async ({ kbnClient }) => {
        if (packId) {
          await cleanupPack(kbnClient, packId);
        }
      });

      test('should strip duplicate policy ids when saving pack', async ({ kbnClient }) => {
        const pack = await getPack(kbnClient, packId);
        expect(pack.policy_ids).toHaveLength(1);
        expect(pack.policy_ids[0]).toBe(policyId);
      });
    });

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe('Non existent policy id should return bad request error', () => {
      const nonExistentPolicyId = 'non-existent-policy-id';

      test('single non-existent policy id', async ({ kbnClient }) => {
        try {
          await kbnClient.request({
            method: 'POST',
            path: '/api/osquery/packs',
            body: {
              name: `test-pack-${Date.now()}`,
              policy_ids: [nonExistentPolicyId],
              queries: {
                test: {
                  ecs_mapping: {},
                  interval: 3600,
                  query: 'select * from uptime;',
                },
              },
              enabled: true,
              shards: {},
            },
          });
          // Should not reach here - expect 400
          expect(true).toBe(false);
        } catch (error: any) {
          const status = error.statusCode || error.status || error.response?.status;
          const message =
            error.data?.message || error.response?.data?.message || error.message || '';
          // eslint-disable-next-line playwright/no-conditional-expect
          expect(status).toBe(400);
          // eslint-disable-next-line playwright/no-conditional-expect
          expect(message).toContain(nonExistentPolicyId);
        }
      });

      test('multiple policy ids with one non-existent policy id', async ({ kbnClient }) => {
        try {
          await kbnClient.request({
            method: 'POST',
            path: '/api/osquery/packs',
            body: {
              name: `test-pack-${Date.now()}`,
              policy_ids: [...Array(999).fill(policyId), nonExistentPolicyId],
              queries: {
                test: {
                  ecs_mapping: {},
                  interval: 3600,
                  query: 'select * from uptime;',
                },
              },
              enabled: true,
              shards: {},
            },
          });
          // Should not reach here - expect 400
          expect(true).toBe(false);
        } catch (error: any) {
          const status = error.statusCode || error.status || error.response?.status;
          const message =
            error.data?.message || error.response?.data?.message || error.message || '';
          // eslint-disable-next-line playwright/no-conditional-expect
          expect(status).toBe(400);
          // eslint-disable-next-line playwright/no-conditional-expect
          expect(message).toContain(nonExistentPolicyId);
        }
      });
    });
  }
);
