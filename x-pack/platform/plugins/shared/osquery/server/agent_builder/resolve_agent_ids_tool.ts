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
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

export const RESOLVE_AGENT_IDS_TOOL_ID = osqueryTool('resolve_agent_ids');

const resolveAgentIdsSchema = z.object({
  hostnames: z
    .array(z.string())
    .min(1)
    .describe('Host names to resolve to Elastic Agent IDs (e.g. ["SRV-DC01", "WKSTN-RECV01"])'),
});

interface ResolvedAgent {
  hostname: string;
  agent_id: string | null;
  status: string | null;
}

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
 * matching the same `local_metadata.host.hostname`. Picking the first match
 * with no ordering previously returned a stale agent id nondeterministically,
 * which silently broke every downstream `run_live_query`/`get_endpoint_status`
 * call against that "resolved" but dead agent. Always prefer an `online`
 * agent, and within ties prefer the most recently enrolled one.
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
    'Returns one entry per requested hostname; agent_id is null if no enrolled agent matched.',
  schema: resolveAgentIdsSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request, spaceId }) => {
    const { hostnames } = input;
    const agentService = osqueryContext.service.getAgentService();

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
      const kuery = hostnames
        .map((h) => `local_metadata.host.hostname:"${h}" or local_metadata.host.name:"${h}"`)
        .join(' or ');

      const { agents } = await agentService
        .asInternalScopedUser(space?.id ?? DEFAULT_SPACE_ID)
        .listAgents({
          kuery: `(${kuery})`,
          perPage: hostnames.length * 5,
          showInactive: false,
        });

      const resolved: ResolvedAgent[] = hostnames.map((hostname) => {
        const matches = agents.filter(
          (a) =>
            a.local_metadata?.host?.hostname === hostname ||
            a.local_metadata?.host?.name === hostname
        );

        // Prefer the currently online agent; among ties (or if none are
        // online) prefer the most recently enrolled — see the multi-
        // enrollment note above.
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
        };
      });

      const unresolved = resolved.filter((r) => !r.agent_id).map((r) => r.hostname);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              resolved,
              ...(unresolved.length > 0 && {
                guidance: `No enrolled agent found for: ${unresolved.join(
                  ', '
                )}. Confirm the host is enrolled in Fleet before retrying.`,
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
