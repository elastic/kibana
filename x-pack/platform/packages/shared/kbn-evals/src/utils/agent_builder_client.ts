/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';

export interface ConverseStep {
  type?: string;
  tool_id?: string;
  tool_call_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
  // Additional Agent Builder step fields are passed through opaquely so the
  // trace-based evaluators / ES|QL extractor can introspect them without us
  // having to model the full Agent Builder step union here.
  [k: string]: unknown;
}

export interface AgentBuilderConverseParams {
  /** Agent Builder agent id to invoke. */
  agentId: string;
  /** The user message sent to the agent. */
  input: string;
  /** Continue an existing conversation. */
  conversationId?: string;
}

export interface AgentBuilderClientResponse {
  /** The agent's final assistant message text. */
  message: string;
  /** Per-round trace of tool calls / results. */
  steps: ConverseStep[];
  /** Populated only when the agent ran with a schema; otherwise undefined on the public converse API. */
  structuredOutput?: unknown;
  conversationId?: string;
  traceId?: string;
}

interface AgentBuilderConverseApiResponse {
  conversation_id?: string;
  trace_id?: string;
  steps?: ConverseStep[];
  response?: { message?: string; structured_output?: unknown };
}

export interface AgentBuilderClient {
  converse(params: AgentBuilderConverseParams): Promise<AgentBuilderClientResponse>;
}

export function createAgentBuilderClient({
  fetch,
  connectorId,
}: {
  fetch: HttpHandler;
  connectorId: string;
}): AgentBuilderClient {
  const converse = async ({
    agentId,
    input,
    conversationId,
  }: AgentBuilderConverseParams): Promise<AgentBuilderClientResponse> => {
    // Retries are owned by the single layer below this one: `httpHandlerFromKbnClient`
    // retries 429/502/503/504 and transport errors with status-aware backoff and honors
    // `retry-after`. Wrapping this call in `withRetry` as well multiplies the two layers
    // (6 attempts x 4 = up to 24 requests for one turn) and re-issues a request while the
    // handler is already backing off, which is the opposite of what an EIS saturation
    // burst needs. Raise `KBN_EVALS_HTTP_RETRIES` if more attempts are wanted.
    const response = await fetch<AgentBuilderConverseApiResponse>('/api/agent_builder/converse', {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({
        agent_id: agentId,
        connector_id: connectorId,
        input,
        // Run the agent inline rather than via Task Manager (the server's auto-detect default).
        // Inline execution runs inside this HTTP request, so the eval worker's W3C `traceparent`
        // propagates and the agent's server-side gen_ai spans nest under the eval's trace — the
        // same id `getCurrentTraceId()` returns. That keeps trace-based metrics correlatable
        // against the default cluster with no `TRACING_ES_URL` (matching the inferenceClient path).
        _execution_mode: 'local',
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
    });

    return {
      message: response.response?.message ?? '',
      steps: response.steps ?? [],
      structuredOutput: response.response?.structured_output,
      conversationId: response.conversation_id,
      traceId: response.trace_id,
    };
  };

  return { converse };
}
