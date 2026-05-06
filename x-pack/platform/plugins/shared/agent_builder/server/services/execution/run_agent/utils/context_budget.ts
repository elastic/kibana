/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { getContextWindowSize } from '@kbn/inference-common';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { CompactionSummary } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * Fraction of the context window reserved for system prompt, output generation,
 * actions buffer, and other overhead that isn't conversation history.
 */
const RESERVED_FRACTION = 0.3;

/**
 * Fraction of the history budget at which compaction should trigger.
 * Setting this below 1.0 leaves headroom so compaction runs before
 * the hard limit is actually reached.
 */
const TRIGGER_FRACTION = 0.8;

/** Fallback context window when the model's size can't be determined */
const DEFAULT_CONTEXT_WINDOW = 128_000;

export interface ContextBudget {
  /** Total context window size for the model in tokens */
  totalBudget: number;
  /** Token budget available for conversation history (after reserving for overhead) */
  historyBudget: number;
  /** Token count at which compaction should be triggered */
  triggerThreshold: number;
}

/**
 * Computes the token budget for conversation history based on the
 * connector's context window size.
 */
export const computeContextBudget = (connector: InferenceConnector): ContextBudget => {
  const totalBudget = getContextWindowSize(connector) ?? DEFAULT_CONTEXT_WINDOW;
  const historyBudget = Math.floor(totalBudget * (1 - RESERVED_FRACTION));
  const triggerThreshold = Math.floor(historyBudget * TRIGGER_FRACTION);

  return { totalBudget, historyBudget, triggerThreshold };
};

/**
 * Message structure overhead per round: role markers, JSON structure
 * for tool calls, separator tokens, etc. Rough empirical estimate.
 */
const PER_ROUND_OVERHEAD_TOKENS = 50;

/**
 * Estimates the token count for a single processed conversation round,
 * including message structure overhead.
 */
export const estimateRoundTokens = (round: ProcessedConversationRound): number => {
  let tokens = PER_ROUND_OVERHEAD_TOKENS;

  // User message + attachments
  tokens += estimateTokens(round.input.message);
  for (const attachment of round.input.attachments) {
    tokens += estimateTokens(attachment.representation.value);
  }

  // Tool call steps
  for (const step of round.steps) {
    tokens += estimateTokens(step);
  }

  // Assistant response
  tokens += estimateTokens(round.response.message);

  return tokens;
};

/**
 * Estimates the total token count for all conversation rounds.
 */
export const estimateConversationTokens = (rounds: ProcessedConversationRound[]): number => {
  return rounds.reduce((total, round) => total + estimateRoundTokens(round), 0);
};

/**
 * Determines whether compaction should be triggered given the current
 * conversation rounds, context budget, and any existing compaction summary.
 *
 * When an existing summary is provided, the effective token count is the
 * summary's token cost plus only the rounds not yet covered by the summary,
 * rather than the raw total of all stored rounds.
 */
export const shouldTriggerCompaction = (
  rounds: ProcessedConversationRound[],
  budget: ContextBudget,
  existingSummary?: CompactionSummary
): boolean => {
  const effectiveTokens = existingSummary
    ? existingSummary.token_count +
      estimateConversationTokens(rounds.slice(existingSummary.summarized_round_count))
    : estimateConversationTokens(rounds);
  return effectiveTokens > budget.triggerThreshold;
};
