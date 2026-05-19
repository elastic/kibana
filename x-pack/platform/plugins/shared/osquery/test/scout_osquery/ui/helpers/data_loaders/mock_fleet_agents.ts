/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import type { Agent } from '@kbn/fleet-plugin/common';
import { kibanaPackageJson } from '@kbn/repo-info';
import { OsqueryDataGenerator, type GeneratedAgent } from './osquery_data_generator';

const OSQUERY_INTEGRATION_NAME = 'osquery_manager';

const AGENTS_LIST_RE = /\/internal\/osquery\/fleet_wrapper\/agents(\?.*)?$/;
const AGENT_BULK_RE = /\/internal\/osquery\/fleet_wrapper\/agents\/_bulk(\?.*)?$/;
// Single-agent detail by id; excludes paths starting with `_` (e.g. `_bulk`) to avoid overlap with AGENT_BULK_RE.
const AGENT_DETAIL_RE = /\/internal\/osquery\/fleet_wrapper\/agents\/(?!_)([^/?]+)(\?.*)?$/;
const POLICIES_LIST_RE = /\/internal\/osquery\/fleet_wrapper\/agent_policies(\?.*)?$/;
const POLICY_DETAIL_RE = /\/internal\/osquery\/fleet_wrapper\/agent_policies\/([^/?]+)(\?.*)?$/;

/** Platforms supported by the mock helper (mirrors common Fleet agent `local_metadata.os.platform`). */
export type MockAgentPlatform = 'linux' | 'darwin' | 'windows';

/** Subset of `AgentStatus` the picker actually surfaces. */
export type MockAgentStatus = 'online' | 'offline' | 'updating' | 'inactive' | 'unenrolled';

export interface MockFleetAgentsOptions {
  /** Number of synthesized agents. Use `0` to exercise the empty-state UI. */
  count: number;
  /** Policy id to attach all synthesized agents to. Defaults to a stable test-only UUID. */
  policyId?: string;
  /** Policy display name (rendered in the agent picker policy section header). */
  policyName?: string;
  /**
   * Optional list of platforms to distribute agents across (round-robin). When
   * omitted all agents are `linux`. Provide e.g. `['linux', 'darwin']` to render
   * agents grouped under multiple platform headers in the picker.
   */
  platforms?: MockAgentPlatform[];
  /** Status applied to every synthesized agent. Defaults to `online`. */
  status?: MockAgentStatus;
  /**
   * Optional explicit hostnames to assign to the synthesized agents (one per
   * agent, in order). Use when a spec navigates to a UI that resolves an agent
   * by hostname (e.g. Infra inventory's host page). When omitted hostnames are
   * auto-generated as `scout-osquery-host-<id-prefix>`.
   */
  hostNames?: string[];
}

export interface MockFleetAgentsResult {
  /** The synthesized agent records the picker will see — useful for `indexActionResponses` / `indexResultRows` callers. */
  agents: GeneratedAgent[];
  /** The mock payload that would be returned by `GET /internal/osquery/fleet_wrapper/agents`. */
  agentsResponse: AgentsResponse;
  /** The mock payload that would be returned by `GET /internal/osquery/fleet_wrapper/agent_policies`. */
  agentPoliciesResponse: AgentPolicyResponseItem[];
  /** The mock payload that would be returned by `GET /internal/osquery/fleet_wrapper/agent_policies/{id}` — includes `package_policies` with osquery_manager enabled so the alert flyout's "Run Osquery" item shows. */
  agentPolicyDetail: AgentPolicyDetailItem;
  /** Resolves the route handlers so subsequent specs in the same context start clean. */
  cleanup: () => Promise<void>;
}

/** Shape returned by `GET /internal/osquery/fleet_wrapper/agents` — see `server/routes/fleet_wrapper/get_agents.ts:137-154`. */
export interface AgentsResponse {
  total: number;
  groups: {
    platforms: Array<{ name: string; id: string; size: number }>;
    overlap: Record<string, Record<string, number>>;
    policies: Array<{ name: string; id: string; size: number }>;
  };
  agents: Agent[];
}

/** Minimal shape returned by `GET /internal/osquery/fleet_wrapper/agent_policies`. */
export interface AgentPolicyResponseItem {
  id: string;
  name: string;
  description?: string;
  namespace: string;
  revision: number;
  is_managed: boolean;
  status: 'active' | 'inactive';
  agents: number;
  updated_at: string;
  updated_by: string;
}

/**
 * Shape returned by `GET /internal/osquery/fleet_wrapper/agent_policies/{id}` —
 * an `AgentPolicyResponseItem` extended with the `package_policies` array that
 * `useIsOsqueryAvailableSimple` reads to decide whether the alert flyout's
 * "Run Osquery" take-action menu item is enabled.
 */
export interface AgentPolicyDetailItem extends AgentPolicyResponseItem {
  package_policies: Array<{
    id: string;
    name: string;
    enabled: boolean;
    package: { name: string; title: string; version: string };
  }>;
}

const DEFAULT_POLICY_ID = '47a4e64e-5dba-4f7a-9f60-f0a0aa3a1f01';
const DEFAULT_POLICY_NAME = 'Osquery policy';

const PLATFORM_OS: Record<
  MockAgentPlatform,
  { family: string; name: string; full: string; kernel: string; version: string }
> = {
  linux: { family: 'linux', name: 'Linux', full: 'Linux 5.15', kernel: '5.15.0', version: '5.15' },
  darwin: {
    family: 'darwin',
    name: 'macOS',
    full: 'macOS 14.0',
    kernel: '23.0.0',
    version: '14.0',
  },
  windows: {
    family: 'windows',
    name: 'Windows',
    full: 'Windows 11',
    kernel: '10.0.22000',
    version: '11',
  },
};

/**
 * Build a Fleet-shaped `Agent` document for the mock response.
 *
 * Only fields the osquery agent picker actually reads are populated. The
 * top-level + `local_metadata.host` / `.os` / `.elastic.agent` keys mirror the
 * shape that Fleet returns from `agentService.listAgents()` so the picker
 * renders identically to the real backend.
 */
function buildAgentDoc(
  generated: GeneratedAgent,
  platform: MockAgentPlatform,
  status: MockAgentStatus,
  policyId: string
): Agent {
  const now = new Date();
  const nowIso = now.toISOString();
  const lastCheckin = new Date(now.getTime() - 30_000).toISOString();
  const version = kibanaPackageJson.version;
  const os = PLATFORM_OS[platform];

  return {
    id: generated.agentId,
    type: 'PERMANENT',
    active: status !== 'unenrolled' && status !== 'inactive',
    enrolled_at: nowIso,
    last_checkin: lastCheckin,
    last_checkin_status: status === 'online' ? 'online' : 'error',
    status,
    policy_id: policyId,
    policy_revision: 1,
    packages: ['osquery_manager'],
    agent: { id: generated.elasticAgentId, version },
    local_metadata: {
      elastic: {
        agent: {
          id: generated.elasticAgentId,
          version,
          'build.original': `${version} (scout-mock-build)`,
          log_level: 'info',
          snapshot: false,
          upgradeable: false,
        },
      },
      host: {
        architecture: 'x86_64',
        hostname: generated.hostName,
        id: generated.elasticAgentId,
        name: generated.hostName,
        ip: [generated.hostIp],
        mac: ['00:00:00:00:00:00'],
      },
      os: {
        family: os.family,
        full: os.full,
        kernel: os.kernel,
        name: os.name,
        platform,
        version: os.version,
      },
    },
    user_provided_metadata: {},
    components: [
      {
        id: 'osquery-0',
        type: 'osquery',
        status: 'HEALTHY',
        message: 'osquery is healthy',
        units: [
          {
            id: 'osquery-input-0',
            type: 'input',
            status: 'HEALTHY',
            message: 'Running osquery',
          },
        ],
      },
    ],
    namespaces: ['default'],
  } as Agent;
}

/** Aggregate the synthesized agents into the `groups` block the backend computes. */
function buildGroups(
  agents: Agent[],
  policyId: string,
  policyName: string
): AgentsResponse['groups'] {
  const platformCounts = new Map<string, number>();
  for (const agent of agents) {
    const platform = (agent.local_metadata?.os?.platform as string) ?? 'linux';
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }

  const platforms = Array.from(platformCounts.entries()).map(([name, size]) => ({
    name,
    id: name,
    size,
  }));

  const overlap: Record<string, Record<string, number>> = {};
  for (const [platform, size] of platformCounts.entries()) {
    overlap[platform] = { [policyId]: size };
  }

  const policies =
    agents.length > 0 ? [{ name: policyName, id: policyId, size: agents.length }] : [];

  return { platforms, overlap, policies };
}

/**
 * Install Playwright `page.route` handlers that fulfill the osquery agent
 * picker's Fleet-wrapper requests with synthesized data, so specs can exercise
 * the picker without running Fleet Server or Elastic Agent containers.
 *
 * Endpoints intercepted (NEVER reach Kibana):
 * - `GET /internal/osquery/fleet_wrapper/agents` — picker rows
 * - `GET /internal/osquery/fleet_wrapper/agents/{id}` — alert flyout's `useIsOsqueryAvailableSimple` lookup; without this the take-action menu hides the "Run Osquery" item.
 * - `POST /internal/osquery/fleet_wrapper/agents/_bulk` — result-table hostname display (`useBulkAgentDetails`).
 * - `GET /internal/osquery/fleet_wrapper/agent_policies` — picker policy headers
 * - `GET /internal/osquery/fleet_wrapper/agent_policies/{id}` — policy detail with `package_policies` (must include osquery_manager enabled so the take-action gate resolves true).
 *
 * Endpoints NOT intercepted (always hit real Kibana / real osquery routes):
 * - `GET /internal/osquery/fleet_wrapper/package_policies` — Tier-A `global.setup.ts` installs
 *   osquery_manager on real Fleet policies, so this endpoint returns real data and gates
 *   the picker fetch the same way it does in production.
 * - `POST /api/osquery/live_queries` — submission
 * - `GET /api/osquery/live_queries/*` — action status, results polling
 * - All other osquery routes (saved queries, packs, alerts, etc.)
 *
 * The mock is purposefully scoped to the Fleet boundary so the osquery surface
 * being tested stays honest. Pair with the existing osquery-side data loaders
 * (`indexActionResponses`, `indexResultRows`) when a spec needs to see results.
 *
 * @example
 * ```ts
 * const { agents } = await mockFleetAgents(page, { count: 2 });
 * await indexActionResponses(esClient, { actionId, agents, rowCountPerAgent: 1 });
 * ```
 */
export async function mockFleetAgents(
  page: ScoutPage,
  options: MockFleetAgentsOptions
): Promise<MockFleetAgentsResult> {
  const { count, platforms, status = 'online', hostNames } = options;
  const policyId = options.policyId ?? DEFAULT_POLICY_ID;
  const policyName = options.policyName ?? DEFAULT_POLICY_NAME;

  if (count < 0 || !Number.isInteger(count)) {
    throw new Error(`mockFleetAgents: \`count\` must be a non-negative integer, got ${count}`);
  }

  if (hostNames && hostNames.length !== count) {
    throw new Error(
      `mockFleetAgents: \`hostNames\` length (${hostNames.length}) must match \`count\` (${count})`
    );
  }

  const generator = new OsqueryDataGenerator({ policyId });
  const generated = Array.from({ length: count }, (_, i) =>
    generator.generateAgent(hostNames ? { hostName: hostNames[i] } : {})
  );

  const effectivePlatforms = platforms?.length ? platforms : (['linux'] as MockAgentPlatform[]);
  const agents = generated.map((g, i) =>
    buildAgentDoc(g, effectivePlatforms[i % effectivePlatforms.length], status, policyId)
  );

  const agentsResponse: AgentsResponse = {
    total: count,
    groups: buildGroups(agents, policyId, policyName),
    agents,
  };

  const policyItem: AgentPolicyResponseItem = {
    id: policyId,
    name: policyName,
    description: 'Mocked by mockFleetAgents',
    namespace: 'default',
    revision: 1,
    is_managed: false,
    status: 'active',
    agents: count,
    updated_at: new Date().toISOString(),
    updated_by: 'scout-mock',
  };

  const agentPoliciesResponse: AgentPolicyResponseItem[] = [policyItem];

  // Detail payload — must include an `enabled` osquery_manager package policy so the alert
  // flyout's `useIsOsqueryAvailableSimple` hook resolves true and the take-action menu
  // surfaces the "Run Osquery" item.
  const agentPolicyDetail: AgentPolicyDetailItem = {
    ...policyItem,
    package_policies: [
      {
        id: `${policyId}-osquery-pkg`,
        name: 'osquery_manager-1',
        enabled: true,
        package: { name: OSQUERY_INTEGRATION_NAME, title: 'Osquery Manager', version: '1.0.0' },
      },
    ],
  };

  const findAgentById = (id: string): Agent | undefined => agents.find((a) => a.id === id);

  await page.route(AGENT_BULK_RE, async (route) => {
    const request = route.request();
    let requested: string[] = [];
    try {
      const body = request.postDataJSON() as { agentIds?: string[] } | null;
      requested = body?.agentIds ?? [];
    } catch {
      requested = [];
    }

    const matched = agents.filter((agent) => requested.includes(agent.id));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ agents: matched }),
    });
  });

  await page.route(AGENT_DETAIL_RE, async (route) => {
    const match = AGENT_DETAIL_RE.exec(route.request().url());
    const id = match?.[1] ?? '';
    const agent = findAgentById(id);
    if (!agent) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 404, message: 'Agent not found' }),
      });

      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ item: agent }),
    });
  });

  await page.route(AGENTS_LIST_RE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agentsResponse),
    });
  });

  await page.route(POLICY_DETAIL_RE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ item: agentPolicyDetail }),
    });
  });

  await page.route(POLICIES_LIST_RE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agentPoliciesResponse),
    });
  });

  const cleanup = async () => {
    await page.unroute(AGENT_BULK_RE);
    await page.unroute(AGENT_DETAIL_RE);
    await page.unroute(AGENTS_LIST_RE);
    await page.unroute(POLICY_DETAIL_RE);
    await page.unroute(POLICIES_LIST_RE);
  };

  return {
    agents: generated,
    agentsResponse,
    agentPoliciesResponse,
    agentPolicyDetail,
    cleanup,
  };
}
