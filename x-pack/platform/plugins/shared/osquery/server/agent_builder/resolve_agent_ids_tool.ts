/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { osqueryTool, osqueryLivePathAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import {
  buildOsqueryPolicyKuery,
  getOsqueryAgentPolicyIds,
} from '../lib/get_osquery_agent_policy_ids';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';

export const RESOLVE_AGENT_IDS_TOOL_ID = osqueryTool('resolve_agent_ids');

const resolveAgentIdsSchema = z.object({
  hostnames: z
    .array(z.string().max(255))
    .min(1)
    .max(50)
    .describe(
      'Host names to resolve to Elastic Agent IDs (e.g. ["SRV-DC01", "WKSTN-RECV01"]). Max 50 hosts, 255 chars per hostname — each issues its own Fleet query.'
    ),
});

import { EXECUTABLE_AGENT_STATUSES } from './agent_statuses';

interface ResolvedAgent {
  hostname: string;
  agent_id: string | null;
  status: string | null;
  osquery_capable: boolean;
}

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
 * entirely. Within a hostname, prefer an `online` agent, then the most recently
 * enrolled.
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
  annotations: {
    title: 'Resolve Osquery Agent IDs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    "Resolve host names to Elastic Agent IDs for use with osquery.run_live_query's agent_ids parameter. " +
    'Use this instead of querying the .fleet-agents index directly via ES|QL or search — that index requires ' +
    'ES-level privileges most roles do not have and will fail with a security_exception. ' +
    'Only returns agents enrolled in an Osquery-capable agent policy. ' +
    'Returns one entry per requested hostname; agent_id is null if no enrolled Osquery-capable agent matched.',
  schema: resolveAgentIdsSchema,
  availability: osqueryLivePathAvailability(osqueryContext),
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

      const listAllMatchingAgents = async (kuery: string): Promise<FleetAgentLike[]> => {
        const perPage = 50;
        const agents: FleetAgentLike[] = [];

        for (let page = 1; ; page++) {
          const response = await scopedAgentClient.listAgents({
            kuery,
            page,
            perPage,
            showInactive: false,
          });
          const pageAgents = response.agents as FleetAgentLike[];
          agents.push(...pageAgents);

          if (pageAgents.length < perPage) {
            return agents;
          }
        }
      };

      const resolveHostname = async (hostname: string): Promise<ResolvedAgent> => {
        const escaped = escapeKueryValue(hostname);
        const hostKuery = `(local_metadata.host.hostname:"${escaped}" or local_metadata.host.name:"${escaped}")`;

        const agents = await listAllMatchingAgents(`${hostKuery} and (${policyKuery})`);

        const matches = (agents as FleetAgentLike[]).filter(
          (agent) =>
            (agent.local_metadata?.host?.hostname === hostname ||
              agent.local_metadata?.host?.name === hostname) &&
            EXECUTABLE_AGENT_STATUSES.has(agent.status ?? '')
        );

        const best = [...matches].sort((a, b) => {
          const aOnline = a.status === 'online' ? 1 : 0;
          const bOnline = b.status === 'online' ? 1 : 0;
          if (aOnline !== bOnline) return bOnline - aOnline;

          return (b.enrolled_at ?? '').localeCompare(a.enrolled_at ?? '');
        })[0];

        return {
          hostname,
          agent_id: best?.id ?? null,
          status: best?.status ?? null,
          osquery_capable: Boolean(best),
        };
      };

      const resolved = await Promise.all(hostnames.map(resolveHostname));
      const unresolved = resolved.filter((r) => !r.agent_id).map((r) => r.hostname);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              resolved,
              ...(unresolved.length > 0 && {
                guidance: `No enrolled Osquery-capable agent found for: ${unresolved.join(
                  ', '
                )}. Confirm the host is enrolled in Fleet and its agent policy includes the Osquery integration before retrying.`,
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
