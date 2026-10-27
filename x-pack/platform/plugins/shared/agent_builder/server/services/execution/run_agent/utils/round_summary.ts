/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRoundStep,
  ExecutionPartialRunSummary,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type {
  ConnectorModelUsageStats,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common/chat';
import type {
  ModelCallInfo,
  ModelProvider,
  ModelProviderStats,
} from '@kbn/agent-builder-server/runner';
import { getCurrentTraceId } from '../../../../tracing';
import type { RunTracker } from '../run_tracker';

/** Output tokens of a call: the thinking tokens are not part of `completion`. */
const getOutputTokens = (tokens: ModelCallInfo['tokens']): number =>
  (tokens?.completion ?? 0) + (tokens?.thinking ?? 0);

/**
 * Groups the calls by connector: the main connector first (when it made calls), then the others
 * in order of first call.
 */
const getConnectorsUsage = (
  calls: ModelCallInfo[],
  mainConnectorId: string
): ConnectorModelUsageStats[] => {
  const byConnector = new Map<string, ConnectorModelUsageStats>();
  for (const { connectorId, tokens, model } of calls) {
    const usage = byConnector.get(connectorId) ?? {
      connector_id: connectorId,
      llm_calls: 0,
      input_tokens: 0,
      output_tokens: 0,
    };
    usage.llm_calls += 1;
    usage.input_tokens += tokens?.prompt ?? 0;
    usage.output_tokens += getOutputTokens(tokens);
    if (tokens?.cached !== undefined) {
      usage.cached_input_tokens = (usage.cached_input_tokens ?? 0) + tokens.cached;
    }
    if (tokens?.thinking !== undefined) {
      usage.reasoning_tokens = (usage.reasoning_tokens ?? 0) + tokens.thinking;
    }
    if (model && usage.model === undefined) {
      usage.model = model;
    }
    byConnector.set(connectorId, usage);
  }

  const mainUsage = byConnector.get(mainConnectorId);
  const otherUsages = [...byConnector.values()].filter(
    ({ connector_id: connectorId }) => connectorId !== mainConnectorId
  );
  return mainUsage ? [mainUsage, ...otherUsages] : otherUsages;
};

export const getModelUsage = (
  stats: ModelProviderStats,
  mainConnectorId: string,
  /** Input tokens of the agent's last research call, from the graph state. */
  lastCallInputTokens?: number
): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let hasCachedInputTokens = false;
  let reasoningTokens = 0;
  let hasReasoningTokens = false;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += getOutputTokens(call.tokens);
    if (call.tokens?.cached !== undefined) {
      cachedInputTokens += call.tokens.cached;
      hasCachedInputTokens = true;
    }
    if (call.tokens?.thinking !== undefined) {
      reasoningTokens += call.tokens.thinking;
      hasReasoningTokens = true;
    }
  }
  const modelFromResponse = stats.calls.find(
    (call) => call.connectorId === mainConnectorId && call.model
  )?.model;
  const connectors = getConnectorsUsage(stats.calls, mainConnectorId);

  return {
    connector_id: mainConnectorId,
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(hasCachedInputTokens ? { cached_input_tokens: cachedInputTokens } : {}),
    ...(hasReasoningTokens ? { reasoning_tokens: reasoningTokens } : {}),
    ...(modelFromResponse ? { model: modelFromResponse } : {}),
    ...(lastCallInputTokens !== undefined ? { last_call_input_tokens: lastCallInputTokens } : {}),
    ...(connectors.length > 0 ? { connectors } : {}),
  };
};

/**
 * Steps and partial run summary of an execution that did not complete. The steps are the ones this
 * execution owns (fresh: everything; resume: the resolved paused calls and the new steps), projected
 * from the latest graph state the stream carried, including tool progress and a `todo_write` the
 * graph never got to fold in. Tool calls still in flight when the run was interrupted are marked
 * `interrupted`.
 */
export const buildInterruptedRound = ({
  tracker,
  startTime,
  endTime,
  modelProvider,
  mainConnectorId,
  configurationOverrides,
}: {
  tracker: RunTracker;
  startTime: Date;
  endTime: Date;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
}): { steps: ConversationRoundStep[]; summary: ExecutionPartialRunSummary } => {
  const traceId = getCurrentTraceId();
  const state = tracker.latestState();
  // The latest `values` chunk is the post-LLM super-step while tools run: a mid-tool interruption
  // leaves the whole group pending, a mid-LLM one leaves nothing pending.
  const inFlight = new Set(state.pendingToolCallIds);
  const steps = tracker
    .executionProjection(state)
    .map((step) =>
      isToolCallStep(step) && inFlight.has(step.tool_call_id)
        ? { ...step, interrupted: true as const }
        : step
    );
  return {
    steps,
    summary: {
      model_usage: getModelUsage(
        modelProvider.getUsageStats(),
        mainConnectorId,
        state.lastCallUsage?.inputTokens
      ),
      time_to_last_token: endTime.getTime() - startTime.getTime(),
      ...(traceId ? { trace_id: traceId } : {}),
      ...(configurationOverrides ? { configuration_overrides: configurationOverrides } : {}),
    },
  };
};
