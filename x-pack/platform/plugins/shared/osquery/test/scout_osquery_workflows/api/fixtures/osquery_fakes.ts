/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
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
export const FLEET_ACTIONS_INDEX = '.fleet-actions';
export const OSQUERY_ACTIONS_INDEX = '.logs-osquery_manager.actions-default';
export const RESPONSES_DATA_STREAM = 'logs-osquery_manager.action.responses-default';
export const RESULTS_DATA_STREAM = 'logs-osquery_manager.result-default';
const API_VERSION = { 'elastic-api-version': '2023-10-31' };

export interface FakeAgent {
  id: string;
  hostname: string;
  /** Fleet `local_metadata.os.platform`: the distribution for Linux, e.g. `ubuntu`. */
  platform: string;
  /** Spaces the agent is visible in (Fleet space awareness). Defaults to `default`. */
  namespaces?: string[];
}

const spacePrefix = (spaceId?: string) => (spaceId ? `/s/${spaceId}` : '');

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
        names: [`${FLEET_AGENTS_INDEX}*`, `${FLEET_ACTIONS_INDEX}*`, `${OSQUERY_ACTIONS_INDEX}*`],
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

export const deleteSystemIndicesUser = async (esClient: Client): Promise<void> => {
  await esClient.security.deleteUser({ username: SYSTEM_USER }, { ignore: [404] });
  await esClient.security.deleteRole({ name: SYSTEM_ROLE }, { ignore: [404] });
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
        namespaces: agent.namespaces ?? ['default'],
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

/** Removes the action documents the dispatched queries left in Fleet and in the osquery index. */
export const deleteDispatchedActions = async (
  systemEs: Client,
  actionIds: string[]
): Promise<void> => {
  if (!actionIds.length) return;

  await systemEs.deleteByQuery({
    index: FLEET_ACTIONS_INDEX,
    refresh: true,
    ignore_unavailable: true,
    query: { terms: { action_id: actionIds } },
  });
  await systemEs.deleteByQuery({
    index: OSQUERY_ACTIONS_INDEX,
    refresh: true,
    ignore_unavailable: true,
    query: {
      bool: {
        should: [
          { terms: { action_id: actionIds } },
          { terms: { 'queries.action_id': actionIds } },
        ],
        minimum_should_match: 1,
      },
    },
  });
};

/**
 * One agent's answer to one query action: a response document and, on success, one result
 * document per row. `error` makes it a failed answer. `ecsMapping` (ECS path to column) is
 * applied to each result document, as osquerybeat does with the query's `ecs_mapping`.
 */
const answeredQueryIds = new Set<string>();

/** Removes the response and result documents `answerQuery` wrote since the last call. */
export const deleteAnsweredQueries = async (esClient: Client): Promise<void> => {
  const ids = [...answeredQueryIds];
  answeredQueryIds.clear();
  if (!ids.length) return;

  await esClient.deleteByQuery({
    index: [RESPONSES_DATA_STREAM, RESULTS_DATA_STREAM],
    refresh: true,
    ignore_unavailable: true,
    query: { terms: { action_id: ids } },
  });
};

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
  answeredQueryIds.add(queryActionId);
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

export interface PackQuery {
  query: string;
  interval: number;
  /** Per-query switch: the live-query route skips `enabled: false` queries. */
  enabled?: boolean;
  ecs_mapping?: Record<string, { field?: string; value?: string | string[] }>;
}

export const createPack = async (
  kbnClient: KbnClient,
  name: string,
  queries: Record<string, PackQuery>,
  spaceId?: string
): Promise<string> => {
  const { data } = await kbnClient.request<{ data: { saved_object_id: string } }>({
    method: 'POST',
    path: `${spacePrefix(spaceId)}/api/osquery/packs`,
    headers: API_VERSION,
    body: { name, enabled: false, queries },
  });

  return data.data.saved_object_id;
};

export const deletePack = async (kbnClient: KbnClient, packId: string, spaceId?: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${spacePrefix(spaceId)}/api/osquery/packs/${packId}`,
    headers: API_VERSION,
    ignoreErrors: [404],
  });
};

/** The osquery action documents dispatched for a pack id (a live query run with `pack_id`). */
export const findPackActionDocs = async (
  systemEs: Client,
  packId: string,
  actionId?: string
): Promise<Array<Record<string, any>>> => {
  await systemEs.indices.refresh({ index: OSQUERY_ACTIONS_INDEX }, { ignore: [404] });
  const result = await systemEs.search({
    index: OSQUERY_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: 10,
    query: {
      bool: {
        filter: [
          { term: { pack_id: packId } },
          ...(actionId ? [{ term: { action_id: actionId } }] : []),
        ],
      },
    },
  });

  return result.hits.hits.map((hit) => hit._source as Record<string, any>);
};

/** All osquery action ids for one agent, including actions from earlier executions. */
export const findAgentActionIds = async (
  systemEs: Client,
  agentId: string
): Promise<Set<string>> => {
  await systemEs.indices.refresh({ index: OSQUERY_ACTIONS_INDEX }, { ignore: [404] });
  const ids = new Set<string>();
  let searchAfter: estypes.SortResults | undefined;
  while (true) {
    const result = await systemEs.search<{ action_id: string }>({
      index: OSQUERY_ACTIONS_INDEX,
      ignore_unavailable: true,
      size: 100,
      query: { term: { agents: agentId } },
      sort: [{ action_id: 'asc' }],
      search_after: searchAfter,
      _source: ['action_id'],
    });
    const { hits } = result.hits;
    for (const hit of hits) {
      if (hit._source) ids.add(hit._source.action_id);
    }

    if (hits.length < 100) return ids;
    searchAfter = hits[hits.length - 1].sort;
  }
};

/**
 * Creates a space for a test that changes space-wide state, such as loading the Elastic prebuilt
 * packs, so it never touches packs that already exist in other spaces. Deleting the space
 * (`deleteTestSpace`) removes every saved object the test created in it.
 */
export const createTestSpace = async (kbnClient: KbnClient, spaceId: string): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    body: { id: spaceId, name: spaceId },
    ignoreErrors: [409],
  });
};

export const deleteTestSpace = async (kbnClient: KbnClient, spaceId: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/spaces/space/${spaceId}`,
    ignoreErrors: [404],
  });
};

/**
 * Deletes the copies of the Elastic prebuilt packs loaded in a test-owned space. Only call it
 * for a space the test created: `POST /internal/osquery/assets/update` copies every prebuilt
 * pack into the space, and other spaces may hold copies a user loaded on purpose.
 */
export const deleteLoadedPrebuiltPacks = async (
  kbnClient: KbnClient,
  spaceId: string
): Promise<void> => {
  const { data } = await kbnClient.request<{ data: Array<{ pack_id: string }> }>({
    method: 'GET',
    path: `${spacePrefix(spaceId)}/internal/osquery/packs/_prebuilt`,
    headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
  });
  for (const { pack_id: packId } of data.data) {
    await deletePack(kbnClient, packId, spaceId);
  }
};

export const loadPrebuiltPacks = async (kbnClient: KbnClient, spaceId: string): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `${spacePrefix(spaceId)}/internal/osquery/assets/update`,
    headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
  });
};
