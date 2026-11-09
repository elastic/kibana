/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import {
  buildOsqueryPolicyKuery,
  getOsqueryAgentPolicyIds,
} from '../lib/get_osquery_agent_policy_ids';
import { buildHostSearchKuery } from '../../common/utils/build_agent_search_kuery';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';

export const RESOLVE_AGENT_IDS_TOOL_ID = osqueryTool('resolve_agent_ids');

const resolveAgentIdsSchema = lazySchema(() =>
  z.object({
    hostnames: z
      .array(z.string())
      .min(1)
      .max(50)
      .describe(
        'Host names to resolve to Elastic Agent IDs (e.g. ["SRV-DC01", "WKSTN-RECV01"]). Max 50 — each hostname issues its own Fleet query.'
      ),
  })
);

interface ResolvedAgent {
  hostname: string;
  agent_id: string | null;
  status: string | null;
  osquery_capable: boolean;
  /** True when no exact match was found but the candidate search hit the page cap. */
  inconclusive?: boolean;
}

const MAX_AGENT_PAGES_PER_HOSTNAME = 10;

const buildExactHostKuery = (hostname: string): string =>
  [...new Set([hostname, hostname.toUpperCase(), hostname.toLowerCase()])]
    .flatMap((value) => [
      `local_metadata.host.hostname.keyword:"${escapeKueryValue(value)}"`,
      `local_metadata.host.name.keyword:"${escapeKueryValue(value)}"`,
    ])
    .join(' or ');

interface FleetAgentLike {
  id: string;
  status?: string;
  enrolled_at?: string;
  policy_id?: string;
  local_metadata?: { host?: { hostname?: string; name?: string } };
}

/**
 * Fleet KQL is quoted-string based, so a value containing `"` or `\` breaks
 * out of its literal and produces a malformed query. Shared by every tool
 * that interpolates caller-supplied hostnames or agent IDs into a KQL clause.
 */
export const escapeKueryValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Resolves host names to Elastic Agent IDs via the Fleet AgentService (the same
 * internal path `osquery.check_integration` and the `get_agents` HTTP route use),
 * NOT raw ES|QL/search against the `.fleet-agents` system index — that index
 * requires ES-level `read`/`view_index_metadata` privileges most Kibana app
 * roles (including serverless `admin`) don't grant, which silently breaks any
 * agent_id resolution attempted via `platform.core.execute_esql` or
 * `platform.core.search`. This tool exists so `osquery.run_live_query` always
 * has a working host -> agent_id path regardless of the caller's ES privileges.
 *
 * A host can have MULTIPLE agent enrollments over its lifetime (reinstall,
 * agent upgrade, re-enrollment after a broken install) — Fleet keeps the old
 * (offline/uninstalled) records around alongside the current one, all
 * matching the same `local_metadata.host.hostname`. Each hostname is therefore
 * resolved with its OWN paged query: a page shared across hostnames is ordered
 * by enrollment time before the online preference is applied client-side, so a
 * batch of newer stale enrollments can push the older online agent off the page
 * entirely. Within a hostname, prefer an `online` agent, then a `degraded`
 * agent, then the most recently enrolled — Fleet's Osquery dispatch path
 * accepts degraded agents, so excluding them would hide live-query-capable
 * hosts.
 *
 * Resolution is additionally constrained to agents enrolled in an
 * osquery-capable agent policy, so it cannot hand back an Elastic Agent that
 * has no osquery integration to execute the downstream live query.
 */
export const resolveAgentIdsTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof resolveAgentIdsSchema> => ({
  id: RESOLVE_AGENT_IDS_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Resolve host names to Elastic Agent IDs for use with osquery.run_live_query's agent_ids parameter. " +
    'Use this instead of querying the .fleet-agents index directly via ES|QL or search — that index requires ' +
    'ES-level privileges most roles do not have and will fail with a security_exception. ' +
    'Only returns agents enrolled in an Osquery-capable agent policy. ' +
    'Returns one entry per requested hostname; agent_id is null if no enrolled Osquery-capable agent matched.',
  schema: resolveAgentIdsSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  annotations: {
    title: 'Resolve hosts to Elastic Agent IDs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (input, { request }) => {
    const { hostnames } = input;
    const agentService = osqueryContext.service.getAgentService();

    if (!(await hasOsqueryToolPrivilege(osqueryContext, request, 'read'))) {
      return unauthorizedToolResult('read');
    }

    if (!agentService) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: 'Fleet AgentService is unavailable.' },
          },
        ],
      };
    }

    try {
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceId = space?.id ?? DEFAULT_SPACE_ID;
      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const { agentPolicyIds, lookupFailed } = await getOsqueryAgentPolicyIds(
        spaceScopedClient,
        osqueryContext
      );

      if (lookupFailed) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message:
                  'Could not determine which agent policies include the Osquery integration, so agent resolution was not attempted. Retry, or verify Fleet is healthy.',
              },
            },
          ],
        };
      }

      if (agentPolicyIds.length === 0) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                resolved: hostnames.map((hostname) => ({
                  hostname,
                  agent_id: null,
                  status: null,
                  osquery_capable: false,
                })),
                guidance:
                  'No agent policy in this space includes the Osquery integration, so no host can run a live query. Add the Osquery Manager integration to the relevant agent policy first.',
              },
            },
          ],
        };
      }

      const policyKuery = buildOsqueryPolicyKuery(agentPolicyIds);
      const scopedAgentClient = agentService.asInternalScopedUser(spaceId);

      const listAllMatchingAgents = async (
        kuery: string
      ): Promise<{ agents: FleetAgentLike[]; truncated: boolean }> => {
        const perPage = 50;
        const agents: FleetAgentLike[] = [];

        // Bounded: a substring kuery can match a large share of the fleet.
        for (let page = 1; page <= MAX_AGENT_PAGES_PER_HOSTNAME; page++) {
          const response = await scopedAgentClient.listAgents({
            kuery,
            page,
            perPage,
            showInactive: false,
          });
          const pageAgents = response.agents as FleetAgentLike[];
          agents.push(...pageAgents);

          if (pageAgents.length < perPage) {
            return { agents, truncated: false };
          }
        }

        return { agents, truncated: true };
      };

      const resolveHostname = async (hostname: string): Promise<ResolvedAgent> => {
        const wanted = hostname.toLowerCase();
        const isExactHost = (agent: FleetAgentLike): boolean =>
          agent.local_metadata?.host?.hostname?.toLowerCase() === wanted ||
          agent.local_metadata?.host?.name?.toLowerCase() === wanted;

        // Exact keyword match first. A substring search for `SRV-1` also matches
        // every `SRV-10...` host, and the page cap could drop the real host before
        // the exact filter below runs.
        const exact = await listAllMatchingAgents(
          `(${buildExactHostKuery(hostname)}) and (${policyKuery})`
        );
        let matches = exact.agents.filter(isExactHost);
        let inconclusive = false;

        const hasLiveMatch = matches.some(
          (agent) => agent.status === 'online' || agent.status === 'degraded'
        );

        if (!hasLiveMatch) {
          // No online agent among the exact-keyword matches: also search the
          // case-insensitive substring way the Osquery agent picker does, since
          // alert `host.name` casing often differs from the Fleet agent's hostname
          // and a stale enrollment must not hide the current one. Hostname-only
          // (not agent id / policy / platform).
          const candidates = await listAllMatchingAgents(
            `(${buildHostSearchKuery(hostname)}) and (${policyKuery})`
          );
          const known = new Set(matches.map((agent) => agent.id));
          matches = [
            ...matches,
            ...candidates.agents.filter((agent) => isExactHost(agent) && !known.has(agent.id)),
          ];
          inconclusive = matches.length === 0 && candidates.truncated;
        }

        const best = [...matches].sort((a, b) => {
          const rank = (status?: string) =>
            status === 'online' ? 2 : status === 'degraded' ? 1 : 0;
          const rankDiff = rank(b.status) - rank(a.status);
          if (rankDiff !== 0) return rankDiff;

          return (b.enrolled_at ?? '').localeCompare(a.enrolled_at ?? '');
        })[0];

        return {
          hostname,
          agent_id: best?.id ?? null,
          status: best?.status ?? null,
          osquery_capable: Boolean(best),
          ...(inconclusive && { inconclusive: true }),
        };
      };

      const resolved = await Promise.all(hostnames.map(resolveHostname));
      const inconclusiveHosts = resolved.filter((r) => r.inconclusive).map((r) => r.hostname);
      const unresolved = resolved
        .filter((r) => !r.agent_id && !r.inconclusive)
        .map((r) => r.hostname);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              resolved,
              ...((unresolved.length > 0 || inconclusiveHosts.length > 0) && {
                guidance: [
                  unresolved.length > 0 &&
                    `No enrolled Osquery-capable agent found for: ${unresolved.join(
                      ', '
                    )}. Confirm the host is enrolled in Fleet and its agent policy includes the Osquery integration before retrying.`,
                  inconclusiveHosts.length > 0 &&
                    `Could not determine an agent for: ${inconclusiveHosts.join(
                      ', '
                    )}. The hostname matches too many agents to search exhaustively; retry with the full, exact hostname or an agent id.`,
                ]
                  .filter(Boolean)
                  .join(' '),
              }),
            },
          },
        ],
      };
    } catch (e) {
      logger.warn(`Failed to resolve agent ids: ${e}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `Failed to resolve agent ids: ${e instanceof Error ? e.message : String(e)}`,
            },
          },
        ],
      };
    }
  },
  tags: ['security', 'osquery', 'fleet', 'agent-resolution'],
});
