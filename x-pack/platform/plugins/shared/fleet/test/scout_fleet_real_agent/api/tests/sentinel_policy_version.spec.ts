/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ENABLE_SENTINEL_POLICY_VERSION_FLAG } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import type { EnrolledAgent } from '../fixtures';

const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };
// The assignment task runs every 5s in the `fleet_real_agent` server config set. Moving an agent
// is then followed by a check in and an acknowledgment of the new policy.
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const POLL_INTERVALS_MS = [2000, 3000, 5000];
const TEST_TIMEOUT_MS = 10 * 60 * 1000;

interface FleetAgentDoc {
  policy_id: string;
  policy_base_id?: string;
  agent_policy_id?: string;
  policy_revision_idx?: number;
  unenrolled_at?: string;
}

apiTest.describe(
  'Sentinel policy version with a real Elastic Agent',
  { tag: ['@local-stateful-classic'] },
  () => {
    let agentPolicyId: string;
    let sentinelPolicyId: string;
    const agents: EnrolledAgent[] = [];

    const getAgentDoc = async (esClient: EsClient, agentId: string) =>
      (await esClient.get<FleetAgentDoc>({ index: '.fleet-agents', id: agentId }))._source!;

    /** Latest revision of every `.fleet-policies` doc of the policy, by `policy_id`. */
    const getPolicyDocs = async (esClient: EsClient) => {
      const response = await esClient.search<{
        policy_id: string;
        revision_idx: number;
        default_fleet_server: boolean;
        data: { id: string };
      }>({
        index: '.fleet-policies',
        size: 100,
        query: { term: { policy_base_id: agentPolicyId } },
        sort: [{ revision_idx: 'desc' }],
      });
      const latest = new Map<string, NonNullable<(typeof response.hits.hits)[number]['_source']>>();
      for (const hit of response.hits.hits) {
        if (!latest.has(hit._source!.policy_id)) {
          latest.set(hit._source!.policy_id, hit._source!);
        }
      }
      return latest;
    };

    const setSentinelFlag = async (
      apiServices: { core: { settings: (overrides: Record<string, any>) => Promise<void> } },
      enabled: boolean
    ) =>
      apiServices.core.settings({
        'feature_flags.overrides': { [ENABLE_SENTINEL_POLICY_VERSION_FLAG]: enabled },
      });

    const expectAgentOnPolicy = async (esClient: EsClient, agentId: string, policyId: string) =>
      expect
        .poll(async () => (await getAgentDoc(esClient, agentId)).policy_id, {
          timeout: POLL_TIMEOUT_MS,
          intervals: POLL_INTERVALS_MS,
          message: `agent ${agentId} should be on ${policyId}`,
        })
        .toBe(policyId);

    apiTest.beforeAll(async ({ kbnClient, realFleet }) => {
      const { data } = await kbnClient.request<{ item: { id: string } }>({
        method: 'POST',
        path: '/api/fleet/agent_policies',
        headers: API_VERSION_HEADER,
        body: {
          name: `scout-sentinel-${Date.now()}`,
          namespace: 'default',
          monitoring_enabled: [],
        },
      });
      agentPolicyId = data.item.id;
      sentinelPolicyId = `${agentPolicyId}#sentinel`;
      agents.push(await realFleet.enrollAgent(agentPolicyId));
    });

    apiTest.afterAll(async () => {
      await Promise.all(agents.map((agent) => agent.stop().catch(() => undefined)));
    });

    apiTest(
      'deploys the base and the #sentinel policy and moves the agent to the #sentinel policy',
      async ({ esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await expectAgentOnPolicy(esClient, agents[0].agentId, sentinelPolicyId);

        const agent = await getAgentDoc(esClient, agents[0].agentId);
        expect(agent.policy_base_id).toBe(agentPolicyId);

        // the agent runs the #sentinel policy, no reassign loop from a mismatching `data.id`
        await expect
          .poll(async () => (await getAgentDoc(esClient, agents[0].agentId)).agent_policy_id, {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
          })
          .toBe(sentinelPolicyId);

        const policyDocs = await getPolicyDocs(esClient);
        const base = policyDocs.get(agentPolicyId)!;
        const sentinel = policyDocs.get(sentinelPolicyId)!;
        expect(base).toBeDefined();
        expect(sentinel).toBeDefined();
        expect(sentinel.revision_idx).toBe(base.revision_idx);
        expect(sentinel.data.id).toBe(sentinelPolicyId);
        expect(base.data.id).toBe(agentPolicyId);
      }
    );

    apiTest(
      'keeps the agent on the #sentinel policy and up to date when the policy is updated',
      async ({ esClient, kbnClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { data } = await kbnClient.request<{ item: { revision: number } }>({
          method: 'PUT',
          path: `/api/fleet/agent_policies/${agentPolicyId}`,
          headers: API_VERSION_HEADER,
          body: {
            name: `scout-sentinel-updated-${Date.now()}`,
            namespace: 'default',
            description: 'updated',
          },
        });
        const revision = data.item.revision;

        await expect
          .poll(
            async () => {
              const policyDocs = await getPolicyDocs(esClient);
              return [
                policyDocs.get(agentPolicyId)?.revision_idx,
                policyDocs.get(sentinelPolicyId)?.revision_idx,
              ];
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toStrictEqual([revision, revision]);

        await expect
          .poll(async () => (await getAgentDoc(esClient, agents[0].agentId)).policy_revision_idx, {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
            message: 'the agent should acknowledge the new revision',
          })
          .toBe(revision);
        expect((await getAgentDoc(esClient, agents[0].agentId)).policy_id).toBe(sentinelPolicyId);
      }
    );

    apiTest(
      'moves the agent back to the base policy when the sentinel version is disabled, and again when enabled',
      async ({ esClient, apiServices }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await setSentinelFlag(apiServices, false);
        try {
          await expectAgentOnPolicy(esClient, agents[0].agentId, agentPolicyId);
          await expect
            .poll(async () => (await getPolicyDocs(esClient)).has(sentinelPolicyId), {
              timeout: POLL_TIMEOUT_MS,
              intervals: POLL_INTERVALS_MS,
              message: 'the #sentinel policy should be cleaned up',
            })
            .toBe(false);
          // the agent keeps checking in on the base policy
          await expect
            .poll(async () => (await getAgentDoc(esClient, agents[0].agentId)).agent_policy_id, {
              timeout: POLL_TIMEOUT_MS,
              intervals: POLL_INTERVALS_MS,
            })
            .toBe(agentPolicyId);
        } finally {
          await setSentinelFlag(apiServices, true);
        }

        await expectAgentOnPolicy(esClient, agents[0].agentId, sentinelPolicyId);
        expect((await getPolicyDocs(esClient)).has(sentinelPolicyId)).toBe(true);
      }
    );

    apiTest(
      'moves an agent enrolled later to the #sentinel policy',
      async ({ esClient, realFleet }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const secondAgent = await realFleet.enrollAgent(agentPolicyId);
        agents.push(secondAgent);

        await expectAgentOnPolicy(esClient, secondAgent.agentId, sentinelPolicyId);
        expect((await getAgentDoc(esClient, secondAgent.agentId)).policy_base_id).toBe(
          agentPolicyId
        );
      }
    );

    apiTest(
      'removes the base and the #sentinel policy docs when the policy is deleted',
      async ({ esClient, kbnClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        for (const agent of agents) {
          await kbnClient.request({
            method: 'POST',
            path: `/api/fleet/agents/${agent.agentId}/unenroll`,
            headers: API_VERSION_HEADER,
            body: { revoke: true },
          });
          await agent.stop();
        }
        agents.length = 0;
        await expect
          .poll(
            async () => {
              const { data } = await kbnClient.request<{ total: number }>({
                method: 'GET',
                path: `/api/fleet/agents?kuery=${encodeURIComponent(
                  `policy_base_id:"${agentPolicyId}"`
                )}&showInactive=false`,
                headers: API_VERSION_HEADER,
              });
              return data.total;
            },
            { timeout: POLL_TIMEOUT_MS, intervals: POLL_INTERVALS_MS }
          )
          .toBe(0);

        await kbnClient.request({
          method: 'POST',
          path: '/api/fleet/agent_policies/delete',
          headers: API_VERSION_HEADER,
          body: { agentPolicyId },
        });

        await expect
          .poll(async () => (await getPolicyDocs(esClient)).size, {
            timeout: POLL_TIMEOUT_MS,
            intervals: POLL_INTERVALS_MS,
          })
          .toBe(0);
      }
    );
  }
);
