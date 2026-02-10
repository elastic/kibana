/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * API helpers for Osquery Scout tests.
 *
 * These functions use Scout's kbnClient to perform CRUD operations
 * that correspond to the Cypress `tasks/api_fixtures.ts` helpers.
 */

function randomString(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

// ── Saved Queries ─────────────────────────────────────────────────────────────

export interface SavedQueryPayload {
  id?: string;
  description?: string;
  ecs_mapping?: Record<string, { field: string }> | Record<string, never>;
  interval?: string;
  query?: string;
  platform?: string;
  timeout?: number;
}

export const defaultSavedQueryPayload: SavedQueryPayload = {
  description: 'Test saved query description',
  ecs_mapping: { labels: { field: 'hours' } },
  interval: '3600',
  query: 'select * from uptime;',
  platform: 'linux,darwin',
};

export async function loadSavedQuery(
  kbnClient: any,
  payload: SavedQueryPayload = defaultSavedQueryPayload
): Promise<any> {
  const body = {
    ...payload,
    id: payload.id ?? randomString(),
  };

  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/osquery/saved_queries',
    body,
  });

  return data.data;
}

export async function cleanupSavedQuery(kbnClient: any, id: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/osquery/saved_queries/${id}`,
    });
  } catch {
    // Ignore — may already be deleted
  }
}

// ── Packs ─────────────────────────────────────────────────────────────────────

export interface PackPayload {
  name?: string;
  description?: string;
  enabled?: boolean;
  queries?: Record<
    string,
    { ecs_mapping?: Record<string, unknown>; interval: number; query: string; platform?: string }
  >;
  policy_ids?: string[];
  shards?: Record<string, unknown>;
}

export function packFixture(): PackPayload {
  return {
    description: randomString(),
    enabled: true,
    name: randomString(),
    queries: {
      [randomString()]: {
        ecs_mapping: {},
        interval: 3600,
        query: 'select * from uptime;',
      },
    },
  };
}

export function multiQueryPackFixture(): PackPayload {
  return {
    description: randomString(),
    enabled: true,
    name: randomString(),
    queries: {
      [randomString()]: {
        ecs_mapping: {},
        interval: 3600,
        platform: 'linux',
        query: 'SELECT * FROM memory_info;',
      },
      [randomString()]: {
        ecs_mapping: {},
        interval: 3600,
        platform: 'linux,windows,darwin',
        query: 'SELECT * FROM system_info;',
      },
      [randomString()]: {
        ecs_mapping: {},
        interval: 10,
        query: 'select opera_extensions.* from users join opera_extensions using (uid);',
      },
    },
  };
}

export async function loadPack(
  kbnClient: any,
  payload: PackPayload = {},
  space = 'default'
): Promise<any> {
  const body = {
    ...payload,
    name: payload.name ?? randomString(),
    shards: payload.shards ?? {},
    queries: payload.queries ?? {},
    enabled: payload.enabled ?? true,
  };

  const path = space === 'default' ? '/api/osquery/packs' : `/s/${space}/api/osquery/packs`;

  const { data } = await kbnClient.request({
    method: 'POST',
    path,
    body,
  });

  return data.data;
}

export async function getPack(kbnClient: any, packId: string): Promise<any> {
  const { data } = await kbnClient.request({
    method: 'GET',
    path: `/api/osquery/packs/${packId}`,
  });

  return data.data;
}

export async function cleanupPack(kbnClient: any, id: string, space = 'default'): Promise<void> {
  try {
    const path =
      space === 'default' ? `/api/osquery/packs/${id}` : `/s/${space}/api/osquery/packs/${id}`;
    await kbnClient.request({
      method: 'DELETE',
      path,
    });
  } catch {
    // Ignore — may already be deleted
  }
}

// ── Live Queries ──────────────────────────────────────────────────────────────

export async function loadLiveQuery(
  kbnClient: any,
  payload = { agent_all: true, query: 'select * from uptime;', kuery: '' }
): Promise<any> {
  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/osquery/live_queries',
    body: payload,
  });

  return data.data;
}

// ── Detection Rules ───────────────────────────────────────────────────────────

export async function loadRule(kbnClient: any, includeResponseActions = false): Promise<any> {
  const body: Record<string, unknown> = {
    type: 'query',
    index: [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'traces-apm*',
      'winlogbeat-*',
      '-*elastic-cloud-logs-*',
    ],
    filters: [
      {
        meta: {
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value: '{"bool":{"must_not":{"wildcard":{"host.name":"dev-fleet-server.*"}}}}',
        },
        query: {
          bool: { must_not: { wildcard: { 'host.name': 'dev-fleet-server.*' } } },
        },
        $state: { store: 'appState' },
      },
    ],
    language: 'kuery',
    query: '_id:*',
    author: [],
    false_positives: [],
    references: [],
    risk_score: 21,
    risk_score_mapping: [],
    severity: 'low',
    severity_mapping: [],
    threat: [],
    name: `Test rule ${randomString()}`,
    description: 'Test rule',
    tags: [],
    license: '',
    interval: '1m',
    from: 'now-360s',
    to: 'now',
    meta: { from: '1m', kibana_siem_app_url: 'http://localhost:5620/app/security' },
    actions: [],
    enabled: true,
    throttle: 'no_actions',
    note: '!{osquery{"query":"SELECT * FROM os_version where name=\'{{host.os.name}}\';","label":"Get processes","ecs_mapping":{"host.os.platform":{"field":"platform"}}}}\n\n!{osquery{"query":"select * from users;","label":"Get users"}}',
  };

  if (includeResponseActions) {
    body.response_actions = [
      {
        params: {
          query: "SELECT * FROM os_version where name='{{host.os.name}}';",
          ecs_mapping: { 'host.os.platform': { field: 'platform' } },
        },
        action_type_id: '.osquery',
      },
      {
        params: { query: 'select * from users;' },
        action_type_id: '.osquery',
      },
    ];
  }

  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/detection_engine/rules',
    body,
  });

  return data;
}

export async function cleanupRule(kbnClient: any, id: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/detection_engine/rules?id=${id}`,
    });
  } catch {
    // Ignore
  }
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export async function loadCase(kbnClient: any, owner: string): Promise<any> {
  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/cases',
    body: {
      title: `Test ${owner} case ${randomString()}`,
      tags: [],
      severity: 'low',
      description: 'Test security case',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true, extractObservables: true },
      owner,
    },
  });

  return data;
}

export async function cleanupCase(kbnClient: any, id: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: '/api/cases',
      query: { ids: JSON.stringify([id]) },
    });
  } catch {
    // Ignore
  }
}

// ── Spaces ────────────────────────────────────────────────────────────────────

export async function loadSpace(kbnClient: any): Promise<{ id: string }> {
  const spaceId = randomString();

  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    body: { id: spaceId, name: spaceId },
  });

  return data;
}

export async function cleanupSpace(kbnClient: any, id: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/spaces/space/${id}`,
    });
  } catch {
    // Ignore
  }
}

// ── Fleet Space Sharing ──────────────────────────────────────────────────────

/**
 * Share osquery package policies to a custom space.
 * When Fleet space awareness migration is completed, package policies are scoped
 * to specific spaces. This function shares existing osquery_manager package policies
 * from the default space to the given custom space so osquery is available there.
 *
 * It also shares the associated agent policies and reassigns agents to trigger
 * namespace updates, making agents visible in the custom space.
 */
export async function shareOsqueryPackagePoliciesToSpace(
  kbnClient: any,
  spaceId: string
): Promise<void> {
  // Get all package policies
  const { data: policiesData } = await kbnClient.request({
    method: 'GET',
    path: '/api/fleet/package_policies?perPage=100',
  });

  const osqueryPolicies = (policiesData?.items ?? []).filter(
    (p: any) => p?.package?.name === 'osquery_manager'
  );

  if (osqueryPolicies.length === 0) {
    return;
  }

  // Share each osquery package policy to the custom space
  const packagePolicyObjects = osqueryPolicies.map((p: any) => ({
    type: 'fleet-package-policies',
    id: p.id,
  }));

  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/_update_objects_spaces',
    body: {
      objects: packagePolicyObjects,
      spacesToAdd: [spaceId],
      spacesToRemove: [],
    },
  });

  // Share the associated agent policies
  const agentPolicyIds = [
    ...new Set(osqueryPolicies.map((p: any) => p.policy_id).filter(Boolean)),
  ] as string[];

  if (agentPolicyIds.length > 0) {
    const agentPolicyObjects = agentPolicyIds.map((id: string) => ({
      type: 'fleet-agent-policies',
      id,
    }));

    try {
      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/_update_objects_spaces',
        body: {
          objects: agentPolicyObjects,
          spacesToAdd: [spaceId],
          spacesToRemove: [],
        },
      });
    } catch {
      // Agent policies may use a different saved object type
    }

    // Reassign agents on these policies to trigger namespace updates.
    // When an agent is reassigned, Fleet updates the agent's namespaces
    // field to match the policy's space_ids.
    for (const policyId of agentPolicyIds) {
      try {
        const { data: agentsData } = await kbnClient.request({
          method: 'GET',
          path: `/api/fleet/agents?perPage=100&kuery=policy_id:${policyId}`,
        });

        for (const agent of agentsData?.items ?? []) {
          try {
            await kbnClient.request({
              method: 'POST',
              path: `/api/fleet/agents/${agent.id}/reassign`,
              body: { policy_id: policyId },
            });
          } catch {
            // Agent may already be in the correct state
          }
        }
      } catch {
        // Continue with other policies
      }
    }
  }
}

// ── Package Policy IDs ────────────────────────────────────────────────────────

/**
 * Safely fetch the policy_ids from the first osquery package policy.
 * Returns an empty array if no package policies are found.
 */
export async function getFirstPackagePolicyIds(kbnClient: any): Promise<string[]> {
  try {
    const { data: policiesResponse } = await kbnClient.request({
      method: 'GET',
      path: '/internal/osquery/fleet_wrapper/package_policies',
      headers: { 'elastic-api-version': '1' },
    });

    const firstItem = (policiesResponse as any)?.items?.[0];
    if (!firstItem) {
      throw new Error(
        'No osquery package policies found. Ensure Fleet is set up and agents are enrolled.'
      );
    }

    return firstItem.policy_ids ?? [];
  } catch (e: any) {
    throw new Error(`Failed to get package policy IDs: ${e.message}`);
  }
}

// ── Agent Policies ────────────────────────────────────────────────────────────

export async function loadAgentPolicy(kbnClient: any): Promise<any> {
  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/agent_policies',
    body: {
      name: randomString(),
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
  });

  return data.item;
}

export async function getInstalledOsqueryIntegrationVersion(kbnClient: any): Promise<string> {
  const { data } = await kbnClient.request({
    method: 'GET',
    path: '/api/fleet/epm/packages/osquery_manager',
  });

  return data.item.version;
}

export async function addOsqueryToAgentPolicy(
  kbnClient: any,
  agentPolicyId: string,
  agentPolicyName: string,
  integrationVersion?: string
): Promise<any> {
  const version = integrationVersion ?? (await getInstalledOsqueryIntegrationVersion(kbnClient));

  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/fleet/package_policies',
    body: {
      policy_id: agentPolicyId,
      package: { name: 'osquery_manager', version },
      name: `Policy for ${agentPolicyName}`,
      description: '',
      namespace: 'default',
      inputs: {
        'osquery_manager-osquery': { enabled: true, streams: {} },
      },
    },
  });

  return data;
}

export async function cleanupAgentPolicy(kbnClient: any, agentPolicyId: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/agent_policies/delete',
      body: { agentPolicyId },
    });
  } catch {
    // Ignore
  }
}
