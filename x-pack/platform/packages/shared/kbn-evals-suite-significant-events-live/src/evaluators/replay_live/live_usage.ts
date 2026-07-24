/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveStageTokenUsage } from '../../data_generators/live_token_usage';
import { addStageTokenUsage, emptyStageTokenUsage } from '../../data_generators/live_token_usage';
import type { ReplayLiveEvaluator, ReplayLiveOutput } from './types';

/**
 * Live-mode replacements for the trace-based cost evaluators. The pipeline's LLM calls run
 * inside server-side workflow executions whose spans carry Kibana's trace ids (not the eval's),
 * so trace queries always come back empty in live mode. These CODE evaluators read the
 * deterministic usage the product itself reports: onboarding `tokensUsed` and conversation
 * round `model_usage`.
 */

const totalUsage = (output: ReplayLiveOutput | undefined): LiveStageTokenUsage => {
  const stages = output?.tokenUsage;
  if (!stages) {
    return emptyStageTokenUsage();
  }
  return [stages.onboarding, stages.discovery, stages.judge].reduce(
    addStageTokenUsage,
    emptyStageTokenUsage()
  );
};

const stageBreakdown = (
  output: ReplayLiveOutput | undefined,
  pick: (usage: LiveStageTokenUsage) => number
): string => {
  const stages = output?.tokenUsage;
  if (!stages) {
    return 'no usage data';
  }
  return `onboarding: ${pick(stages.onboarding)}, discovery: ${pick(
    stages.discovery
  )}, judge: ${pick(stages.judge)}`;
};

const createUsageEvaluator = (
  name: string,
  pick: (usage: LiveStageTokenUsage) => number,
  unit: string
): ReplayLiveEvaluator => ({
  name,
  kind: 'CODE',
  evaluate: ({ output }) => {
    if (!output?.tokenUsage) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: `No token usage data available for ${name}`,
      });
    }
    const total = pick(totalUsage(output));
    return Promise.resolve({
      score: total,
      explanation: `${total} ${unit} (${stageBreakdown(output, pick)})`,
    });
  },
});

export const liveInputTokensEvaluator = createUsageEvaluator(
  'live_input_tokens',
  (usage) => usage.inputTokens,
  'input token(s)'
);

export const liveOutputTokensEvaluator = createUsageEvaluator(
  'live_output_tokens',
  (usage) => usage.outputTokens,
  'output token(s)'
);

export const liveCachedTokensEvaluator = createUsageEvaluator(
  'live_cached_tokens',
  (usage) => usage.cachedTokens,
  'cached input token(s)'
);

/** Onboarding does not report call counts, so this covers the discovery + judge agents only. */
export const liveLlmCallsEvaluator = createUsageEvaluator(
  'live_llm_calls',
  (usage) => usage.llmCalls,
  'LLM call(s)'
);

/** Tool calls counted from the fetched agent conversation steps (discovery + judge). */
export const liveToolCallsEvaluator: ReplayLiveEvaluator = {
  name: 'live_tool_calls',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const countToolCalls = (steps: ReplayLiveOutput['steps']) =>
      (steps ?? []).filter((step) => step.type === 'tool_call').length;
    const discoveryCalls = countToolCalls(output?.steps);
    const judgeCalls = countToolCalls(output?.judgeSteps);
    return Promise.resolve({
      score: discoveryCalls + judgeCalls,
      explanation: `${
        discoveryCalls + judgeCalls
      } tool call(s) (discovery: ${discoveryCalls}, judge: ${judgeCalls})`,
    });
  },
};

/** Wall-clock duration of the whole pipeline run in seconds, with per-stage breakdown. */
export const livePipelineDurationEvaluator: ReplayLiveEvaluator = {
  name: 'live_pipeline_duration',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const durations = output?.stageDurationsMs;
    if (!durations) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No stage duration data available',
      });
    }
    const seconds = (ms: number) => Math.round(ms / 1000);
    return Promise.resolve({
      score: seconds(durations.total),
      explanation:
        `${seconds(durations.total)}s total (onboarding: ${seconds(durations.onboarding)}s, ` +
        `streaming: ${seconds(durations.streaming)}s, orchestrator: ${seconds(
          durations.orchestrator
        )}s)`,
    });
  },
};
