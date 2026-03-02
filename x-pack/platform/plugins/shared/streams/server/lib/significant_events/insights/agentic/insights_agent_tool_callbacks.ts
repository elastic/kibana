/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolCallback, ToolCall, ToolCallbackResult } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { getFindChangedQueriesTool } from '../../agent/tools/find_changed_queries';
import { getClusterByTimeTool } from '../../agent/tools/cluster_by_time';
import { getGroupWithinWindowTool } from '../../agent/tools/group_within_window';
import { getSampleClusterTool } from '../../agent/tools/sample_cluster';
import { getDescribeClusterTool } from '../../agent/tools/describe_cluster';
import { getGetEntityTimelineTool } from '../../agent/tools/get_entity_timeline';
import { getExploreTopologyTool } from '../../agent/tools/explore_topology';
import { getCompareToBaselineTool } from '../../agent/tools/compare_to_baseline';
import { getContextExpansionTool } from '../../agent/tools/context_expansion';
import { getEmbeddingSearchSimilarTool } from '../../agent/tools/embedding_search_similar';
import type { SignificantEventsAgentToolDependencies } from '../../agent/tool_dependencies';
import { SUBMIT_INSIGHTS_TOOL_NAME } from '../client/insight_tool';

/** Stream tool registration shape used for adapter (id, schema, handler). */
interface StreamToolAdapter {
  id: string;
  schema: z.ZodType;
  handler: (input: unknown, context: { request: KibanaRequest }) => Promise<{ results: unknown[] }>;
}

function parseArgs(toolCall: ToolCall): unknown {
  const raw =
    typeof toolCall.function.arguments === 'string'
      ? (JSON.parse(toolCall.function.arguments) as unknown)
      : toolCall.function.arguments;
  return raw;
}

function registerCallback(
  callbacks: Record<string, ToolCallback>,
  tool: StreamToolAdapter,
  context: { request: KibanaRequest }
): void {
  callbacks[tool.id] = async (toolCall: ToolCall): Promise<ToolCallbackResult> => {
    const raw = parseArgs(toolCall);
    const parsed = tool.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        response: {
          error: 'Invalid arguments',
          details: parsed.error.message,
        } as Record<string, unknown>,
      };
    }
    const result = await tool.handler(parsed.data, context);
    const responsePayload =
      result.results.length === 1 ? result.results[0] : { results: result.results };
    return {
      response: (typeof responsePayload === 'object' && responsePayload !== null
        ? responsePayload
        : { value: responsePayload }) as Record<string, unknown>,
    };
  };
}

/**
 * Builds toolCallbacks for executeAsReasoningAgent from the same agent tools
 * registered with Agent Builder. Each callback parses the tool call arguments,
 * runs the tool handler with the given request context, and returns the result.
 */
export function createInsightsAgentToolCallbacks(
  deps: SignificantEventsAgentToolDependencies,
  request: KibanaRequest
): Record<string, ToolCallback> {
  const context = { request };
  const callbacks: Record<string, ToolCallback> = {};

  registerCallback(
    callbacks,
    getFindChangedQueriesTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(callbacks, getClusterByTimeTool(deps) as unknown as StreamToolAdapter, context);
  registerCallback(
    callbacks,
    getGroupWithinWindowTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(callbacks, getSampleClusterTool(deps) as unknown as StreamToolAdapter, context);
  registerCallback(
    callbacks,
    getDescribeClusterTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(
    callbacks,
    getGetEntityTimelineTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(
    callbacks,
    getExploreTopologyTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(
    callbacks,
    getCompareToBaselineTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(
    callbacks,
    getContextExpansionTool(deps) as unknown as StreamToolAdapter,
    context
  );
  registerCallback(
    callbacks,
    getEmbeddingSearchSimilarTool(deps) as unknown as StreamToolAdapter,
    context
  );

  callbacks[platformCoreTools.executeEsql] = async (
    toolCall: ToolCall
  ): Promise<ToolCallbackResult> => {
    const raw = parseArgs(toolCall);
    const parsed = z.object({ query: z.string() }).safeParse(raw);
    if (!parsed.success) {
      return {
        response: {
          error: 'Invalid arguments',
          details: parsed.error.message,
        } as Record<string, unknown>,
      };
    }
    try {
      const { scopedClusterClient } = await deps.getScopedClients({ request });
      const result = await executeEsql({
        query: parsed.data.query,
        esClient: scopedClusterClient.asCurrentUser,
      });
      return {
        response: {
          columns: result.columns,
          values: result.values,
        } as Record<string, unknown>,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        response: {
          error: 'ES|QL execution failed',
          details: message,
        } as Record<string, unknown>,
      };
    }
  };

  callbacks[SUBMIT_INSIGHTS_TOOL_NAME] = async () => ({
    response: { received: true },
  });

  return callbacks;
}
