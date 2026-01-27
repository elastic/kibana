/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';

/**
 * Domain ID for all agentBuilder usage counters
 */
export const AGENTBUILDER_USAGE_DOMAIN = 'agent_builder';

/**
 * Create usage counter for agentBuilder plugin
 * @param usageCollection - Usage collection setup contract
 * @returns Usage counter instance
 */
export function createAgentBuilderUsageCounter(
  usageCollection?: UsageCollectionSetup
): UsageCounter | undefined {
  if (!usageCollection) {
    return undefined;
  }

  return usageCollection.createUsageCounter(AGENTBUILDER_USAGE_DOMAIN);
}

/**
 * Helper to track tool calls with source
 * @param usageCounter - Usage counter instance
 * @param source - Tool call source
 */
export function trackToolCall(
  usageCounter: UsageCounter | undefined,
  source: 'default_agent' | 'custom_agent' | 'mcp' | 'api' | 'a2a'
): void {
  if (!usageCounter) return;

  usageCounter.incrementCounter({
    counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_${source}`,
    counterType: 'count',
    incrementBy: 1,
  });
}

/**
 * Helper to track LLM usage
 * @param usageCounter - Usage counter instance
 * @param provider - LLM provider (e.g., 'openai', 'bedrock')
 * @param model - Model identifier
 */
export function trackLLMUsage(
  usageCounter: UsageCounter | undefined,
  provider: string,
  model: string
): void {
  if (!usageCounter) return;

  usageCounter.incrementCounter({
    counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_${provider}`,
    counterType: 'count',
    incrementBy: 1,
  });

  usageCounter.incrementCounter({
    counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_model_${model}`,
    counterType: 'count',
    incrementBy: 1,
  });
}

/**
 * Helper to track conversation rounds
 * @param usageCounter - Usage counter instance
 * @param roundNumber - Current round number
 */
export function trackConversationRound(
  usageCounter: UsageCounter | undefined,
  roundNumber: number
): void {
  if (!usageCounter) return;

  let bucket: string;
  if (roundNumber <= 5) {
    bucket = 'rounds_1-5';
  } else if (roundNumber <= 10) {
    bucket = 'rounds_6-10';
  } else if (roundNumber <= 20) {
    bucket = 'rounds_11-20';
  } else if (roundNumber <= 50) {
    bucket = 'rounds_21-50';
  } else {
    bucket = 'rounds_51+';
  }

  usageCounter.incrementCounter({
    counterName: `${AGENTBUILDER_USAGE_DOMAIN}_${bucket}`,
    counterType: 'count',
    incrementBy: 1,
  });
}

/**
 * Helper to track query-to-result time
 * @param usageCounter - Usage counter instance
 * @param durationMs - Duration in milliseconds
 */
export function trackQueryToResultTime(
  usageCounter: UsageCounter | undefined,
  durationMs: number
): void {
  if (!usageCounter) return;

  let bucket: string;
  if (durationMs < 1000) {
    bucket = 'query_to_result_time_<1s';
  } else if (durationMs < 5000) {
    bucket = 'query_to_result_time_1-5s';
  } else if (durationMs < 10000) {
    bucket = 'query_to_result_time_5-10s';
  } else if (durationMs < 30000) {
    bucket = 'query_to_result_time_10-30s';
  } else {
    bucket = 'query_to_result_time_30s+';
  }

  usageCounter.incrementCounter({
    counterName: `${AGENTBUILDER_USAGE_DOMAIN}_${bucket}`,
    counterType: 'count',
    incrementBy: 1,
  });
}
