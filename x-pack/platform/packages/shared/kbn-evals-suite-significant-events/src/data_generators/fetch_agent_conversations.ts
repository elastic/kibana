/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConverseStep } from '@kbn/evals';
import type { LiveStageTokenUsage } from './live_token_usage';
import { emptyStageTokenUsage } from './live_token_usage';

const AGENT_BUILDER_API_VERSION = '2023-10-31';
const CONVERSATIONS_PATH = '/api/agent_builder/conversations';

interface ConversationSummary {
  id: string;
  agent_id: string;
  created_at?: string;
  updated_at?: string;
}

interface ConversationRound {
  steps?: ConverseStep[];
  model_usage?: {
    llm_calls?: number;
    input_tokens?: number;
    output_tokens?: number;
    cached_input_tokens?: number;
  };
}

interface ConversationWithRounds extends ConversationSummary {
  rounds?: ConversationRound[];
}

export interface AgentConversationData {
  steps: ConverseStep[];
  /** Summed `model_usage` across all fetched rounds — the deterministic token accounting. */
  tokensUsed: LiveStageTokenUsage;
}

/**
 * Fetch the steps of every conversation a workflow-invoked agent held during the run window.
 * The discovery/triage workflows run their agents with `create-conversation: true` but never
 * expose the conversation id in their outputs, so the eval lists conversations by agent id and
 * keeps the ones updated after the run started.
 *
 * Conversation round steps (`type: 'tool_call'`, `tool_id`, `params`, `results`) are structurally
 * the same shape as the converse API's steps, so the existing discovery evaluators and
 * `extractDiscoveriesFromToolCall` consume them unchanged. Round `model_usage` stats are summed
 * as the stage's token accounting (the trace-based evaluators cannot see workflow-side spans).
 */
export async function fetchAgentConversationData({
  kbnClient,
  log,
  agentId,
  sinceMs,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentId: string;
  /** Only conversations updated at/after this time belong to the current run. */
  sinceMs: number;
}): Promise<AgentConversationData> {
  const listResponse = await kbnClient.request<{ results?: ConversationSummary[] }>({
    path: CONVERSATIONS_PATH,
    method: 'GET',
    query: { agent_id: agentId },
    headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
  });

  const runConversations = (listResponse.data.results ?? []).filter((conversation) => {
    const updatedAt = conversation.updated_at ?? conversation.created_at;
    return updatedAt != null && new Date(updatedAt).getTime() >= sinceMs;
  });

  const steps: ConverseStep[] = [];
  const tokensUsed = emptyStageTokenUsage();

  if (runConversations.length === 0) {
    log.warning(`No conversations found for agent "${agentId}" within the run window`);
    return { steps, tokensUsed };
  }

  for (const conversation of runConversations) {
    const conversationResponse = await kbnClient.request<ConversationWithRounds>({
      path: `${CONVERSATIONS_PATH}/${conversation.id}`,
      method: 'GET',
      headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
    });
    for (const round of conversationResponse.data.rounds ?? []) {
      steps.push(...(round.steps ?? []));
      tokensUsed.inputTokens += round.model_usage?.input_tokens ?? 0;
      tokensUsed.outputTokens += round.model_usage?.output_tokens ?? 0;
      tokensUsed.cachedTokens += round.model_usage?.cached_input_tokens ?? 0;
      tokensUsed.llmCalls += round.model_usage?.llm_calls ?? 0;
    }
  }

  log.info(
    `Fetched ${steps.length} step(s) from ${runConversations.length} conversation(s) of agent "${agentId}" ` +
      `(${tokensUsed.llmCalls} LLM call(s), ${tokensUsed.inputTokens} input / ${tokensUsed.outputTokens} output tokens)`
  );
  return { steps, tokensUsed };
}
