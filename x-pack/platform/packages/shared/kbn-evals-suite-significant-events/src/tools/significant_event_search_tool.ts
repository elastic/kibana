/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import { SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID } from '@kbn/significant-events-plugin/server';

/**
 * Prior Significant Events context tool for the KI extraction evals.
 *
 * This mirrors the production factory in
 * `significant_events/server/lib/significant_events/ki_extraction_context_tools.ts`.
 * It is duplicated here (rather than imported) because that factory bridges the
 * Agent Builder `event_search` tool through the in-process `agentBuilder.tools`
 * start contract, which is not available to the Scout evaluation process. Here
 * the `event_search` tool is executed over HTTP via the Agent Builder public
 * tool-execution endpoint instead.
 */

/** Result envelope returned by `POST /api/agent_builder/tools/_execute`. */
export interface AgentBuilderToolResult {
  type: string;
  data: unknown;
}
export type ExecuteAgentBuilderTool = (
  toolId: string,
  toolParams: Record<string, unknown>
) => Promise<{ results?: AgentBuilderToolResult[] }>;

export interface EvalSignificantEventSearchTool {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

const formatToolResults = (results: AgentBuilderToolResult[] | undefined) => {
  const list = results ?? [];
  const errors = list
    .filter((result) => result.type === 'error')
    .map((result) => (result.data as { message?: string })?.message ?? 'Unknown tool error');
  const data = list.filter((result) => result.type !== 'error');
  return {
    results: data,
    count: data.length,
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
};

/**
 * Builds the inference reasoning-agent tool that bridges to the Agent Builder
 * `event_search` tool via `executeTool` (HTTP). Mirrors the production tool name,
 * schema shape, and prompt snippet so the eval exercises the same code path.
 */
export const createEvalSignificantEventSearchTool = ({
  executeTool,
  streamName,
  logger,
}: {
  executeTool: ExecuteAgentBuilderTool;
  streamName: string;
  logger: Logger;
}): EvalSignificantEventSearchTool => {
  const tools: Record<string, ToolDefinition> = {
    significant_event_search: {
      description:
        'Search existing Significant Events for the target stream (and related filters). ' +
        'Use view "full" when you need assessment notes, demotion justifications, or linked investigation outcomes. ' +
        'Prefer status filters (e.g. dismissed) when looking for known-noisy / demoted patterns to avoid regenerating.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description:
              'Optional case-insensitive substring over event title, summary, and symptom hypothesis. Omit to return all events for the stream/state.',
          },
          status: {
            type: 'string' as const,
            description:
              'Optional status filter (e.g. "dismissed" to find known-noisy / demoted patterns).',
          },
          view: {
            type: 'string' as const,
            enum: ['compact', 'full'] as const,
            description:
              'Response detail. "compact" (default) returns summaries; "full" returns complete events with assessment notes.',
          },
        },
      },
    },
  };

  const callbacks: Record<string, ToolCallback> = {
    significant_event_search: async (toolCall) => {
      const { query, status, view } = toolCall.function.arguments as {
        query?: string;
        status?: string;
        view?: 'compact' | 'full';
      };
      try {
        const { results } = await executeTool(SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID, {
          stream_names: [streamName],
          ...(query !== undefined ? { query } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(view !== undefined ? { view } : {}),
        });
        return { response: formatToolResults(results) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`significant_event_search eval tool failed: ${message}`);
        return { response: { results: [], count: 0, error: message } };
      }
    },
  };

  const promptSnippet = `
You also have access to prior Significant Events and investigation outcomes for this stream. Before proposing new KI features, consult that history so you do not blindly reintroduce patterns the system has already classified:
- **significant_event_search** — Search Significant Events (open, dismissed, closed). Use \`view: "full"\` to include assessment notes and linked investigations; use status \`dismissed\` when checking for known noise / demotions.

When prior findings show a pattern was noisy, single-tenant, known-benign, or already investigated as non-actionable, prefer refining/avoiding that path over regenerating an equivalent feature.`;

  return { tools, callbacks, promptSnippet };
};
