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
import type { RoundModelUsageStats } from '@kbn/agent-builder-common/chat';
import type { ModelProvider, ModelProviderStats } from '@kbn/agent-builder-server/runner';
import { getCurrentTraceId } from '../../../../tracing';
import type { RunTracker } from '../run_tracker';

export const getModelUsage = (
  stats: ModelProviderStats,
  mainConnectorId: string
): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let hasCachedInputTokens = false;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
    if (call.tokens?.cached !== undefined) {
      cachedInputTokens += call.tokens.cached;
      hasCachedInputTokens = true;
    }
  }
  const modelFromResponse = stats.calls.find(
    (call) => call.connectorId === mainConnectorId && call.model
  )?.model;

  return {
    connector_id: mainConnectorId,
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(hasCachedInputTokens ? { cached_input_tokens: cachedInputTokens } : {}),
    ...(modelFromResponse ? { model: modelFromResponse } : {}),
  };
};

/**
 * Steps and partial run summary of an execution that did not complete. The steps are the ones this
 * execution owns (fresh: everything; resume: the resolved paused calls and the new steps), projected
 * from the latest graph state the stream carried, including tool progress and a `todo_write` the
 * graph never got to fold in.
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
  return {
    steps: tracker.executionProjection(),
    summary: {
      model_usage: getModelUsage(modelProvider.getUsageStats(), mainConnectorId),
      time_to_last_token: endTime.getTime() - startTime.getTime(),
      ...(traceId ? { trace_id: traceId } : {}),
      ...(configurationOverrides ? { configuration_overrides: configurationOverrides } : {}),
    },
  };
};
