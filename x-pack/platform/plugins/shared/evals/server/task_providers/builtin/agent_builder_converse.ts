/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILT_IN_TASK_PROVIDERS } from '../types';
import type { EvalsTaskProvider } from '../types';
import { normalizeTraceId, withEvalsTaskSpan } from '../tracing';

const CONVERSE_PATH = '/api/agent_builder/converse';
const AGENT_BUILDER_API_VERSION = '2023-10-31';

const PROMPT_KEYS = ['input', 'prompt', 'question', 'query', 'text', 'message'] as const;

const extractInput = (input: Record<string, unknown>): string => {
  for (const key of PROMPT_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return JSON.stringify(input);
};

interface ConverseApiResponse {
  conversation_id?: string;
  /** A round can carry one trace id, or several when it spans multiple executions. */
  trace_id?: string | string[];
  steps?: unknown[];
  response?: { message?: string; structured_output?: unknown };
}

/**
 * Evaluates an Agent Builder agent via the public `converse` API. The call runs in a fresh
 * per-example root span ({@link withEvalsTaskSpan}) so the inline agent's spans get a unique
 * trace id per example; otherwise a chat-launched run would fold every example (and judge call)
 * into the chat's trace and mis-score trace-based metrics. The returned `trace_id` correlates
 * the scores.
 */
export const createAgentBuilderConverseTaskProvider = (): EvalsTaskProvider => ({
  name: BUILT_IN_TASK_PROVIDERS.agentBuilderConverse,
  description: 'Evaluate an Agent Builder agent via the converse API.',
  run: async ({ input, connectorId, agentId, callKibanaApi }) => {
    if (!agentId) {
      throw new Error('The "agentBuilder.converse" task provider requires an agent_id');
    }

    return withEvalsTaskSpan('task · agent', async () => {
      const { body } = await callKibanaApi<ConverseApiResponse>({
        method: 'POST',
        path: CONVERSE_PATH,
        headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
        body: {
          agent_id: agentId,
          connector_id: connectorId,
          input: extractInput(input),
          _execution_mode: 'local',
        },
      });

      const traceId = Array.isArray(body.trace_id) ? body.trace_id[0] : body.trace_id;

      return {
        output: {
          message: body.response?.message ?? '',
          ...(body.response?.structured_output !== undefined
            ? { structured_output: body.response.structured_output }
            : {}),
          ...(body.steps ? { steps: body.steps } : {}),
          ...(body.conversation_id ? { conversation_id: body.conversation_id } : {}),
        },
        traceId: normalizeTraceId(traceId),
      };
    });
  },
});
