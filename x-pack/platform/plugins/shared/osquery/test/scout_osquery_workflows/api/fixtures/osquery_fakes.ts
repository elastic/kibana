/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { set } from '@kbn/safer-lodash-set';
import type { KbnClient, ScoutTestConfig } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test-es-server';

/**
 * Fake osquery agents, answers and results, so the workflow steps can be tested without
 * enrolled agents. Fleet only reads agents from `.fleet-agents`, a restricted index, so agents
 * are written as a user with `allow_restricted_indices`. Answers go to the data streams the
 * osquery integration (bundled in Scout) defines.
 */

const SYSTEM_ROLE = 'osquery_workflows_fake_agents';
const SYSTEM_USER = 'osquery_workflows_fake_agents';
const SYSTEM_PASSWORD = 'osquery-workflows-fake-agents';

export const FLEET_AGENTS_INDEX = '.fleet-agents';
export const RESPONSES_DATA_STREAM = 'logs-osquery_manager.action.responses-default';
export const RESULTS_DATA_STREAM = 'logs-osquery_manager.result-default';
const API_VERSION = { 'elastic-api-version': '2023-10-31' };

export interface FakeAgent {
  id: string;
  hostname: string;
  /** Fleet `local_metadata.os.platform`: the distribution for Linux, e.g. `ubuntu`. */
  platform: string;
}

export const createSystemIndicesClient = async (
  esClient: Client,
  config: ScoutTestConfig
): Promise<Client> => {
  await esClient.security.putRole({
    name: SYSTEM_ROLE,
    refresh: 'wait_for',
    cluster: ['all'],
    indices: [
      {
        // `.fleet-agents` is an alias: delete-by-query writes to the backing `.fleet-agents-7`.
        names: [`${FLEET_AGENTS_INDEX}*`],
        privileges: ['all'],
        allow_restricted_indices: true,
      },
    ],
  });
  await esClient.security.putUser({
    username: SYSTEM_USER,
    password: SYSTEM_PASSWORD,
    roles: [SYSTEM_ROLE],
    refresh: 'wait_for',
  });

  return createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: { username: SYSTEM_USER, password: SYSTEM_PASSWORD },
    isCloud: config.isCloud,
  });
};

/** An agent policy with the osquery integration, so fake agents are osquery agents. */
export const createOsqueryAgentPolicy = async (kbnClient: KbnClient, name: string) => {
  const { data: pkg } = await kbnClient.request<{ item: { version: string } }>({
    method: 'GET',
    path: '/api/fleet/epm/packages/osquery_manager',
  });
  const { data: policy } = await kbnClient.request<{ item: { id: string } }>({
    method: 'POST',
    path: '/api/fleet/agent_policies',
    body: { name, namespace: 'default', monitoring_enabled: [] },
  });
  await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/package_policies',
    body: {
      name: `${name}-osquery`,
      namespace: 'default',
      policy_ids: [policy.item.id],
      package: { name: 'osquery_manager', version: pkg.item.version },
      inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
    },
  });

  return policy.item.id;
};

export const deleteAgentPolicy = async (kbnClient: KbnClient, policyId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/agent_policies/delete',
    body: { agentPolicyId: policyId, force: true },
    ignoreErrors: [404, 400],
  });
};

/** Online agents: a fresh `last_checkin` makes Fleet's computed status `online`. */
export const indexFakeAgents = async (
  systemEs: Client,
  policyId: string,
  agents: FakeAgent[]
): Promise<void> => {
  const now = new Date().toISOString();
  await systemEs.bulk({
    refresh: 'wait_for',
    operations: agents.flatMap((agent) => [
      { index: { _index: FLEET_AGENTS_INDEX, _id: agent.id } },
      {
        active: true,
        type: 'PERMANENT',
        policy_id: policyId,
        policy_revision_idx: 1,
        namespaces: ['default'],
        enrolled_at: now,
        last_checkin: now,
        last_checkin_status: 'online',
        agent: { id: agent.id, version: '9.3.0' },
        local_metadata: {
          elastic: { agent: { id: agent.id, version: '9.3.0' } },
          host: { hostname: agent.hostname, name: agent.hostname, id: agent.id },
          os: { platform: agent.platform, name: agent.platform, family: agent.platform },
        },
      },
    ]),
  });
};

export const deleteFakeAgents = async (systemEs: Client, agentIds: string[]): Promise<void> => {
  await systemEs.deleteByQuery({
    index: FLEET_AGENTS_INDEX,
    refresh: true,
    ignore_unavailable: true,
    query: { ids: { values: agentIds } },
  });
};

/**
 * One agent's answer to one query action: a response document and, on success, one result
 * document per row. `error` makes it a failed answer. `ecsMapping` (ECS path to column) is
 * applied to each result document, as osquerybeat does with the query's `ecs_mapping`.
 */
export const answerQuery = async (
  esClient: Client,
  {
    queryActionId,
    agent,
    rows = [],
    ecsMapping = {},
    error,
  }: {
    queryActionId: string;
    agent: FakeAgent;
    rows?: Array<Record<string, string>>;
    ecsMapping?: Record<string, string>;
    error?: string;
  }
): Promise<void> => {
  const now = new Date().toISOString();
  await esClient.index({
    index: RESPONSES_DATA_STREAM,
    refresh: 'wait_for',
    op_type: 'create',
    document: {
      '@timestamp': now,
      event: { ingested: now },
      action_id: queryActionId,
      agent_id: agent.id,
      agent: { id: agent.id },
      started_at: now,
      completed_at: now,
      action_response: { osquery: { count: error ? 0 : rows.length } },
      ...(error ? { error } : {}),
    },
  });

  if (rows.length) {
    await esClient.bulk({
      refresh: 'wait_for',
      operations: rows.flatMap((row) => {
        const doc = {
          '@timestamp': now,
          event: { ingested: now },
          action_id: queryActionId,
          agent: { id: agent.id, name: agent.hostname },
          osquery: row,
        };
        Object.entries(ecsMapping).forEach(([ecsPath, column]) => set(doc, ecsPath, row[column]));

        return [{ create: { _index: RESULTS_DATA_STREAM } }, doc];
      }),
    });
  }
};

export const createSavedQuery = async (
  kbnClient: KbnClient,
  body: { id: string; query: string; ecs_mapping?: Record<string, unknown> },
  spaceId?: string
): Promise<string> => {
  const { data } = await kbnClient.request<{ data: { saved_object_id: string } }>({
    method: 'POST',
    path: `${spaceId ? `/s/${spaceId}` : ''}/api/osquery/saved_queries`,
    headers: API_VERSION,
    body: { interval: '3600', description: 'osquery workflow steps test', ...body },
  });

  return data.data.saved_object_id;
};

export const deleteSavedQuery = async (
  kbnClient: KbnClient,
  savedObjectId: string,
  spaceId?: string
) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${spaceId ? `/s/${spaceId}` : ''}/api/osquery/saved_queries/${savedObjectId}`,
    headers: API_VERSION,
    ignoreErrors: [404],
  });
};

export const createPack = async (
  kbnClient: KbnClient,
  name: string,
  queries: Record<string, { query: string; interval: number }>
): Promise<string> => {
  const { data } = await kbnClient.request<{ data: { saved_object_id: string } }>({
    method: 'POST',
    path: '/api/osquery/packs',
    headers: API_VERSION,
    body: { name, enabled: false, queries },
  });

  return data.data.saved_object_id;
};

export const deletePack = async (kbnClient: KbnClient, packId: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/osquery/packs/${packId}`,
    headers: API_VERSION,
    ignoreErrors: [404],
  });
};
