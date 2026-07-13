/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILT_IN_TASK_PROVIDERS } from '../types';
import type { EvalsTaskProvider } from '../types';
import { normalizeTraceId, withEvalsTaskSpan } from '../tracing';

const TOOL_EXECUTE_PATH = '/api/agent_builder/tools/_execute';
const AGENT_BUILDER_API_VERSION = '2023-10-31';

interface ExecuteToolApiResponse {
  results?: unknown[];
  trace_id?: string;
}

/** Evaluates an Agent Builder tool directly; use `agentBuilder.converse` for LLM tracing. */
export const createAgentBuilderToolTaskProvider = (): EvalsTaskProvider => ({
  name: BUILT_IN_TASK_PROVIDERS.agentBuilderTool,
  description: 'Evaluate an Agent Builder tool/skill via the tools/_execute API.',
  run: async ({ input, connectorId, toolId, params, callKibanaApi }) => {
    if (!toolId) {
      throw new Error('The "agentBuilder.tool" task provider requires a tool_id');
    }

    const toolParams =
      params?.tool_params && typeof params.tool_params === 'object'
        ? (params.tool_params as Record<string, unknown>)
        : input;

    // Wrap in a fresh per-example root span so the tool's server-side spans share
    // one isolated trace id, even when the run was launched from a chat that has its
    // own active trace (otherwise every example would collapse into the caller's trace).
    return withEvalsTaskSpan('task · tool', async () => {
      const { body } = await callKibanaApi<ExecuteToolApiResponse>({
        method: 'POST',
        path: TOOL_EXECUTE_PATH,
        headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
        body: {
          tool_id: toolId,
          tool_params: toolParams,
          connector_id: connectorId,
        },
      });

      return {
        output: { results: body.results ?? [] },
        traceId: normalizeTraceId(body.trace_id),
      };
    });
  },
});
