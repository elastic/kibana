/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { GenerateInsightsResult } from '@kbn/streams-schema';
import { createInsightsAgentPrompt } from './insights_agent_prompt';
import { createInsightsAgentToolCallbacks } from './insights_agent_tool_callbacks';
import type { SignificantEventsAgentToolDependencies } from '../../agent/tool_dependencies';
import { extractInsightsFromResponse } from '../extract_insights_from_response';
import { SUBMIT_INSIGHTS_TOOL_NAME } from '../client/insight_tool';

const DEFAULT_MAX_STEPS = 10;

/**
 * Generates insights using the agentic flow: a single call to executeAsReasoningAgent
 * with the Significant Events agent instructions and tools (gather_context,
 * find_changed_queries, cluster_by_time, etc.). The agent uses tools to explore
 * and must complete by calling submit_insights.
 *
 * Use this when you want the LLM to drive the analysis with full tool access.
 * The original step-by-step flow remains in generate_insights.ts.
 */
export async function generateInsightsAgentic({
  agentDeps,
  request,
  inferenceClient,
  signal,
  logger,
  streamNames,
  from,
  to,
  maxSteps = DEFAULT_MAX_STEPS,
}: {
  /** Dependencies for the agent tools (getScopedClients, logger, telemetry). */
  agentDeps: SignificantEventsAgentToolDependencies;
  /** Request used to scope tool calls (e.g. runContext.fakeRequest in tasks). */
  request: KibanaRequest;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  /** When provided, only analyze these stream names; otherwise the agent may use all streams. */
  streamNames?: string[];
  from: string;
  to: string;
  maxSteps?: number;
}): Promise<GenerateInsightsResult> {
  const prompt = createInsightsAgentPrompt(agentDeps);
  const toolCallbacks = createInsightsAgentToolCallbacks(agentDeps, request);

  logger.debug(
    () =>
      `Running agentic insights for range ${from}-${to}` +
      (streamNames?.length ? `, streams: ${streamNames.join(', ')}` : '')
  );

  const response = await executeAsReasoningAgent({
    prompt,
    input: {
      stream_names: streamNames?.length ? streamNames.join(', ') : undefined,
      from,
      to,
    },
    inferenceClient,
    toolCallbacks,
    finalToolChoice: { function: SUBMIT_INSIGHTS_TOOL_NAME },
    maxSteps,
    abortSignal: signal,
  });

  const insights = extractInsightsFromResponse({ toolCalls: response.toolCalls ?? [] }, logger);

  logger.debug(() => `Agentic run produced ${insights.length} insights`);

  return {
    insights,
    tokensUsed: response.tokens ?? { prompt: 0, completion: 0, total: 0, cached: 0 },
  };
}
