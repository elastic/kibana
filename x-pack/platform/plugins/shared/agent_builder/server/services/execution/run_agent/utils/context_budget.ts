/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { getContextWindowSize } from '@kbn/inference-common';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { CompactionSummary, AgentExecutionEvent } from '@kbn/agent-builder-common';
import type { ProcessedTimelineEvent, ProcessedUserMessageEvent } from './prepare_conversation';
import {
  isProcessedUserMessageEvent,
  isProcessedAgentExecutionEvent,
} from './prepare_conversation';

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
 * Message structure overhead per event: role markers, JSON structure
 * for tool calls, separator tokens, etc. Rough empirical estimate.
 */
const PER_EVENT_OVERHEAD_TOKENS = 25;

/**
 * Estimates the token count for a single timeline event.
 */
export const estimateEventTokens = (event: ProcessedTimelineEvent): number => {
  let tokens = PER_EVENT_OVERHEAD_TOKENS;

  if (isProcessedUserMessageEvent(event)) {
    const userEvent = event as ProcessedUserMessageEvent;
    tokens += estimateTokens(userEvent.processedInput.message);
    for (const attachment of userEvent.processedInput.attachments) {
      tokens += estimateTokens(attachment.representation.value);
    }
  } else if (isProcessedAgentExecutionEvent(event)) {
    const agentEvent = event as AgentExecutionEvent;
    // Tool call steps
    for (const step of agentEvent.steps) {
      tokens += estimateTokens(step);
    }
    // Assistant response
    tokens += estimateTokens(agentEvent.response.message);
  }

  return tokens;
};

/**
 * Estimates the total token count for all timeline events.
 */
export const estimateTimelineTokens = (events: ProcessedTimelineEvent[]): number => {
  return events.reduce((total, event) => total + estimateEventTokens(event), 0);
};

/**
 * Determines whether compaction should be triggered given the current
 * timeline events, context budget, and any existing compaction summary.
 *
 * When an existing summary is provided, the effective token count is the
 * summary's token cost plus only the events not yet covered by the summary.
 * `summarized_round_count` maps to the count of AgentExecutionEvents to skip.
 */
export const shouldTriggerCompaction = (
  events: ProcessedTimelineEvent[],
  budget: ContextBudget,
  existingSummary?: CompactionSummary
): boolean => {
  if (!existingSummary) {
    return estimateTimelineTokens(events) > budget.triggerThreshold;
  }
  // Skip events that are already summarized (count by AgentExecutionEvents)
  const eventsAfterSummary = skipSummarizedEvents(events, existingSummary.summarized_round_count);
  const effectiveTokens = existingSummary.token_count + estimateTimelineTokens(eventsAfterSummary);
  return effectiveTokens > budget.triggerThreshold;
};

/**
 * Skips events that have already been summarized.
 * `summarizedCount` is the number of AgentExecutionEvents to skip.
 */
export const skipSummarizedEvents = (
  events: ProcessedTimelineEvent[],
  summarizedCount: number
): ProcessedTimelineEvent[] => {
  let agentResponsesSeen = 0;
  for (let i = 0; i < events.length; i++) {
    if (isProcessedAgentExecutionEvent(events[i])) {
      agentResponsesSeen++;
      if (agentResponsesSeen >= summarizedCount) {
        // Return everything after this point (the next event onward)
        return events.slice(i + 1);
      }
    }
  }
  return events;
};
