/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  EMPTY_TOKENS,
  type AnalysisTarget,
  type SignificantEventsToolUsage,
} from '@kbn/nightshift-ai';
import { createAgentBuilderClient, type ConverseStep } from '@kbn/evals';
import {
  KI_QUERY_GENERATION_AGENT_ID,
  WRITE_QUERIES_TOOL_ID,
  buildKIQueryGenerationUserMessage,
  type AcceptedQuery,
} from '@kbn/significant-events-plugin/server';

export interface RunKIQueryGenerationAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  target: AnalysisTarget;
  connectorId: string;
}

export interface RunKIQueryGenerationAgentResult {
  queries: AcceptedQuery[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}

// Underscored form of the skill's features-get tool id (the skill maps `.` -> `_`
// in getInlineTools); `platform_sig_events_ki_queries_write` already has no dots.
const GET_FEATURES_STEP_TOOL_ID = 'platform_sig_events_ki_features_get';

// Maps the agent's pipeline endpoints onto the legacy {get_stream_features, add_queries}
// tool-usage shape the evaluators read: feature retrieval and the terminal query write.
const computeToolUsage = (steps: ConverseStep[]): SignificantEventsToolUsage => {
  const usageFor = (toolId: string, isSuccess: (data: Record<string, unknown>) => boolean) => {
    const calls = steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId);
    const failures = calls.filter(
      (step) =>
        !step.results?.some(
          (result) =>
            typeof result === 'object' &&
            result !== null &&
            'data' in result &&
            typeof (result as { data: unknown }).data === 'object' &&
            (result as { data: unknown }).data !== null &&
            isSuccess((result as { data: Record<string, unknown> }).data)
        )
    ).length;
    return { calls: calls.length, failures, latency_ms: 0 };
  };

  return {
    get_stream_features: usageFor(GET_FEATURES_STEP_TOOL_ID, (data) =>
      Array.isArray(data.features)
    ),
    add_queries: usageFor(WRITE_QUERIES_TOOL_ID, (data) => data.written === true),
  };
};

export const getSuccessfulWriteQueriesParams = (
  steps: ConverseStep[]
): { queries: AcceptedQuery[] } => {
  const writeStep = steps.findLast(
    (step) =>
      step.type === 'tool_call' &&
      step.tool_id === WRITE_QUERIES_TOOL_ID &&
      step.results?.some(
        (toolResult) =>
          typeof toolResult === 'object' &&
          toolResult !== null &&
          'data' in toolResult &&
          typeof toolResult.data === 'object' &&
          toolResult.data !== null &&
          'written' in toolResult.data &&
          toolResult.data.written === true
      )
  );
  if (!writeStep?.params) {
    throw new Error('KI query generation agent did not successfully call write_queries');
  }
  const rawParams = writeStep.params as { queries: AcceptedQuery[] };
  if (!Array.isArray(rawParams.queries)) {
    throw new Error('KI query generation agent returned invalid write_queries output');
  }
  return rawParams;
};

export async function runKIQueryGenerationAgent({
  fetch,
  log,
  target,
  connectorId,
}: RunKIQueryGenerationAgentParams): Promise<RunKIQueryGenerationAgentResult> {
  const agentBuilderClient = createAgentBuilderClient({ fetch, log, connectorId });
  const conversation = await agentBuilderClient.createConversation({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    title: `KI query generation: ${target.name}`,
  });
  const userMessage = buildKIQueryGenerationUserMessage(target);
  const result = await agentBuilderClient.converse({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    conversationId: conversation.id,
    input: userMessage,
  });
  const { queries } = getSuccessfulWriteQueriesParams(result.steps);
  return {
    queries,
    tokensUsed: result.tokensUsed ?? { ...EMPTY_TOKENS },
    toolUsage: computeToolUsage(result.steps),
  };
}
