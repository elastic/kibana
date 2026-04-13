/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  CompactionSummary,
  CompactionStructuredData,
  CompactionToolCallSummary,
  AgentExecutionEvent,
} from '@kbn/agent-builder-common';
import { ChatEventType, isToolCallStep } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn } from '@kbn/agent-builder-server';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ProcessedConversation, ProcessedTimelineEvent } from './prepare_conversation';
import { isProcessedAgentExecutionEvent } from './prepare_conversation';
import type { ContextBudget } from './context_budget';
import {
  estimateTimelineTokens,
  estimateEventTokens,
  shouldTriggerCompaction,
  skipSummarizedEvents,
} from './context_budget';
import { convertPreviousEvents } from './to_langchain_messages';
import { llmCompactionSchema, COMPACTION_SYSTEM_PROMPT } from './compaction_schema';
import type { LlmCompactionOutput } from './compaction_schema';

/**
 * Number of most-recent agent responses to always preserve verbatim (never compact).
 * These give the LLM immediate context about the latest interaction.
 */
const PRESERVED_RECENT_RESPONSES = 2;

/** Max characters for a tool params summary before truncation */
const PARAMS_SUMMARY_MAX_LENGTH = 120;

export interface CompactConversationOptions {
  processedConversation: ProcessedConversation;
  chatModel: InferenceChatModel;
  contextBudget: ContextBudget;
  existingSummary?: CompactionSummary;
  logger: Logger;
  abortSignal?: AbortSignal;
  eventEmitter?: AgentEventEmitterFn;
}

export interface CompactedConversation {
  processedConversation: ProcessedConversation;
  summary?: CompactionSummary;
  compactionTriggered: boolean;
  /** Token count before compaction (only set when compactionTriggered is true) */
  tokensBefore?: number;
  /** Token count after compaction (only set when compactionTriggered is true) */
  tokensAfter?: number;
  /** Number of agent responses that were summarized or removed */
  summarizedRoundCount?: number;
}

/**
 * Serializes CompactionStructuredData into a formatted text block
 * suitable for injection into the LLM prompt.
 */
export const serializeCompactionSummary = (data: CompactionStructuredData): string => {
  const parts: string[] = [];

  parts.push(`## Conversation Summary (compacted from previous rounds)`);
  parts.push(`**User Intent:** ${data.user_intent}`);
  parts.push(`**Discussion Summary:** ${data.discussion_summary}`);

  if (data.key_topics.length > 0) {
    parts.push(`**Key Topics:** ${data.key_topics.join(', ')}`);
  }

  if (data.entities.length > 0) {
    const entityLines = data.entities.map((e) => `- ${e.type}: ${e.name}`).join('\n');
    parts.push(`**Entities:**\n${entityLines}`);
  }

  if (data.tool_calls_summary.length > 0) {
    const toolLines = data.tool_calls_summary
      .map((tc) => `- [${tc.tool_id}] ${tc.params_summary}`)
      .join('\n');
    parts.push(`**Tool Call History:**\n${toolLines}`);
  }

  if (data.outcomes_and_decisions.length > 0) {
    const outcomeLines = data.outcomes_and_decisions.map((o) => `- ${o}`).join('\n');
    parts.push(`**Outcomes & Decisions:**\n${outcomeLines}`);
  }

  if (data.agent_actions.length > 0) {
    const actionLines = data.agent_actions.map((a) => `- ${a}`).join('\n');
    parts.push(`**Agent Actions:**\n${actionLines}`);
  }

  if (data.unanswered_questions.length > 0) {
    const questionLines = data.unanswered_questions.map((q) => `- ${q}`).join('\n');
    parts.push(`**Unanswered Questions:**\n${questionLines}`);
  }

  return parts.join('\n\n');
};

// ---------------------------------------------------------------------------
// Programmatic extraction helpers
// ---------------------------------------------------------------------------

/**
 * Summarises a tool call's params object into a short human-readable string.
 * Keeps it under PARAMS_SUMMARY_MAX_LENGTH so the serialized summary stays compact.
 */
const summarizeParams = (params: Record<string, unknown>): string => {
  const raw = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}=${value}`;
      }
      if (Array.isArray(value)) {
        return `${key}=[${value.join(', ')}]`;
      }
      return `${key}=${JSON.stringify(value)}`;
    })
    .join(', ');

  if (raw.length <= PARAMS_SUMMARY_MAX_LENGTH) {
    return raw;
  }
  return `${raw.slice(0, PARAMS_SUMMARY_MAX_LENGTH)}…`;
};

/**
 * Walks agent response events and extracts deterministic summary fields:
 * - tool_calls_summary: list of tool calls with their params
 * - agent_actions: human-readable description of each tool call
 */
export const extractProgrammaticSummary = (
  agentResponses: AgentExecutionEvent[]
): {
  tool_calls_summary: CompactionToolCallSummary[];
  agent_actions: string[];
} => {
  const toolCalls: CompactionToolCallSummary[] = [];
  const agentActions: string[] = [];

  for (const response of agentResponses) {
    for (const step of response.steps) {
      if (!isToolCallStep(step)) {
        continue;
      }

      const paramsSummary = summarizeParams(step.params);
      toolCalls.push({ tool_id: step.tool_id, params_summary: paramsSummary });
      agentActions.push(`Called ${step.tool_id}(${paramsSummary})`);
    }
  }

  return {
    tool_calls_summary: toolCalls,
    agent_actions: agentActions,
  };
};

// ---------------------------------------------------------------------------
// Event splitting helpers
// ---------------------------------------------------------------------------

/**
 * Count the number of AgentExecutionEvents in an event list.
 */
const countAgentResponses = (events: ProcessedTimelineEvent[]): number => {
  return events.filter(isProcessedAgentExecutionEvent).length;
};

/**
 * Split events into "to summarize" and "to preserve" parts.
 * Keeps the last `preserveCount` AgentExecutionEvents (and any events after the split point).
 */
const splitEventsForCompaction = (
  events: ProcessedTimelineEvent[],
  preserveCount: number
): { toSummarize: ProcessedTimelineEvent[]; toPreserve: ProcessedTimelineEvent[] } => {
  const totalResponses = countAgentResponses(events);
  if (totalResponses <= preserveCount) {
    return { toSummarize: [], toPreserve: events };
  }

  const responsesToSummarize = totalResponses - preserveCount;
  let responsesSeen = 0;
  let splitIdx = 0;

  for (let i = 0; i < events.length; i++) {
    if (isProcessedAgentExecutionEvent(events[i])) {
      responsesSeen++;
      if (responsesSeen >= responsesToSummarize) {
        splitIdx = i + 1;
        break;
      }
    }
  }

  return {
    toSummarize: events.slice(0, splitIdx),
    toPreserve: events.slice(splitIdx),
  };
};

/**
 * Extract AgentExecutionEvent[] from a mixed event list.
 */
const extractAgentResponses = (events: ProcessedTimelineEvent[]): AgentExecutionEvent[] => {
  return events.filter(isProcessedAgentExecutionEvent) as AgentExecutionEvent[];
};

// ---------------------------------------------------------------------------
// Main compaction pipeline
// ---------------------------------------------------------------------------

/**
 * Compaction pipeline with hybrid extraction:
 *
 * 1. Check whether compaction is needed (token threshold)
 * 2. Reuse an existing summary if it still fits
 * 3. Extract deterministic fields programmatically (tool calls, actions)
 * 4. Call the LLM for semantic fields (summary, intent, entities, outcomes, etc.)
 * 5. Merge both into CompactionStructuredData and persist
 * 6. Fall back to hard truncation if the result still exceeds the budget
 */
export const compactConversation = async ({
  processedConversation,
  chatModel,
  contextBudget,
  existingSummary,
  logger,
  abortSignal,
  eventEmitter,
}: CompactConversationOptions): Promise<CompactedConversation> => {
  const { previousEvents } = processedConversation;

  // Under threshold: apply existing summary if present (so the LLM sees
  // the compacted view) but don't report a new compaction event.
  if (!shouldTriggerCompaction(previousEvents, contextBudget, existingSummary)) {
    if (existingSummary) {
      const compacted = applyExistingSummary(processedConversation, existingSummary);
      return {
        processedConversation: compacted,
        summary: existingSummary,
        compactionTriggered: false,
      };
    }
    return { processedConversation, compactionTriggered: false };
  }

  const rawTokens = estimateTimelineTokens(previousEvents);
  const effectiveTokens = existingSummary
    ? existingSummary.token_count +
      estimateTimelineTokens(
        skipSummarizedEvents(previousEvents, existingSummary.summarized_round_count)
      )
    : rawTokens;
  logger.info(
    `Compaction triggered: ${effectiveTokens} effective tokens (${rawTokens} raw) exceeds threshold of ${contextBudget.triggerThreshold}`
  );

  // Emit compactionStarted before the LLM summarization call
  eventEmitter?.({
    type: ChatEventType.compactionStarted,
    data: { token_count_before: rawTokens },
  });

  // Generate a new summary covering all older events via LLM + programmatic extraction
  const summarizationResult = await summarizeOlderEvents(
    processedConversation,
    chatModel,
    contextBudget,
    logger,
    existingSummary,
    abortSignal
  );

  if (summarizationResult.summary) {
    const afterTokens =
      estimateTimelineTokens(summarizationResult.processedConversation.previousEvents) +
      summarizationResult.summary.token_count;
    if (afterTokens <= contextBudget.historyBudget) {
      logger.debug(
        `Summarization sufficient: ${afterTokens} tokens (budget: ${contextBudget.historyBudget})`
      );

      eventEmitter?.({
        type: ChatEventType.compactionCompleted,
        data: {
          token_count_after: afterTokens,
          summarized_round_count: summarizationResult.summary.summarized_round_count,
        },
      });

      return {
        ...summarizationResult,
        compactionTriggered: true,
        tokensBefore: rawTokens,
        tokensAfter: afterTokens,
        summarizedRoundCount: summarizationResult.summary.summarized_round_count,
      };
    }
  }

  // Hard truncation fallback
  const truncated = applyHardTruncation(summarizationResult.processedConversation, contextBudget);
  const truncatedTokens =
    estimateTimelineTokens(truncated.previousEvents) +
    (summarizationResult.summary?.token_count ?? 0);
  logger.debug('Applied hard truncation fallback');

  eventEmitter?.({
    type: ChatEventType.compactionCompleted,
    data: {
      token_count_after: truncatedTokens,
      summarized_round_count: summarizationResult.summary?.summarized_round_count ?? 0,
    },
  });

  return {
    processedConversation: truncated,
    summary: summarizationResult.summary,
    compactionTriggered: true,
    tokensBefore: rawTokens,
    tokensAfter: truncatedTokens,
    summarizedRoundCount: summarizationResult.summary?.summarized_round_count ?? 0,
  };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const applyExistingSummary = (
  conversation: ProcessedConversation,
  summary: CompactionSummary
): ProcessedConversation => {
  return {
    ...conversation,
    previousEvents: skipSummarizedEvents(
      conversation.previousEvents,
      summary.summarized_round_count
    ),
    compactionSummary: summary,
  };
};

/**
 * Hybrid summarization: extracts deterministic fields programmatically,
 * calls the LLM for semantic fields, then merges both.
 */
const summarizeOlderEvents = async (
  conversation: ProcessedConversation,
  chatModel: InferenceChatModel,
  budget: ContextBudget,
  logger: Logger,
  existingSummary?: CompactionSummary,
  abortSignal?: AbortSignal
): Promise<{ processedConversation: ProcessedConversation; summary?: CompactionSummary }> => {
  const { previousEvents } = conversation;
  const totalResponses = countAgentResponses(previousEvents);
  const preserveCount = Math.min(PRESERVED_RECENT_RESPONSES, totalResponses);

  if (totalResponses <= preserveCount) {
    return { processedConversation: conversation };
  }

  const { toSummarize, toPreserve } = splitEventsForCompaction(previousEvents, preserveCount);
  const agentResponsesToSummarize = extractAgentResponses(toSummarize);

  // Phase 1: programmatic extraction from all older agent responses
  const programmatic = extractProgrammaticSummary(agentResponsesToSummarize);

  try {
    // Phase 2: LLM call for semantic fields
    const llmOutput = await generateLlmSummary(
      conversation,
      toSummarize,
      programmatic,
      chatModel,
      existingSummary,
      abortSignal
    );

    // Phase 3: merge into CompactionStructuredData
    const structuredData: CompactionStructuredData = {
      ...llmOutput,
      ...programmatic,
    };

    const summaryText = serializeCompactionSummary(structuredData);
    const summaryTokenCount = estimateTokens(summaryText);

    const summary: CompactionSummary = {
      summarized_round_count: agentResponsesToSummarize.length,
      created_at: new Date().toISOString(),
      token_count: summaryTokenCount,
      structured_data: structuredData,
    };

    return {
      processedConversation: {
        ...conversation,
        previousEvents: toPreserve,
        compactionSummary: summary,
      },
      summary,
    };
  } catch (error) {
    logger.error(`Compaction summarization failed, falling through to truncation: ${error}`);
    return { processedConversation: conversation };
  }
};

/**
 * Calls the LLM with a focused schema containing only semantic fields.
 */
const generateLlmSummary = async (
  conversation: ProcessedConversation,
  eventsToSummarize: ProcessedTimelineEvent[],
  programmatic: {
    tool_calls_summary: CompactionToolCallSummary[];
    agent_actions: string[];
  },
  chatModel: InferenceChatModel,
  existingSummary?: CompactionSummary,
  abortSignal?: AbortSignal
): Promise<LlmCompactionOutput> => {
  // Only send events not already covered by the existing summary as raw history.
  const alreadySummarizedCount = existingSummary?.summarized_round_count ?? 0;
  const newEvents = skipSummarizedEvents(eventsToSummarize, alreadySummarizedCount);

  const tempConversation: ProcessedConversation = {
    ...conversation,
    previousEvents: newEvents,
  };

  const historyMessages = await convertPreviousEvents({
    conversation: tempConversation,
    compactionSummary: existingSummary,
  });

  // Build a context block with the programmatically extracted tool calls
  const toolLines = programmatic.tool_calls_summary
    .map((tc) => `- ${tc.tool_id}(${tc.params_summary})`)
    .join('\n');
  const toolContext =
    programmatic.tool_calls_summary.length > 0
      ? `\n\nFor reference, here are the tool calls that were made (already captured separately):\n${toolLines}`
      : '';

  const messages: BaseMessageLike[] = [
    ['system', COMPACTION_SYSTEM_PROMPT],
    ...historyMessages,
    ['user', `Please generate a structured summary of this conversation history.${toolContext}`],
  ];

  const structuredModel = chatModel.withStructuredOutput(llmCompactionSchema, {
    name: 'compact_conversation',
  });

  return await structuredModel.invoke(messages, { signal: abortSignal });
};

/**
 * Drop oldest events one by one until the conversation
 * fits within the history budget. Always preserves at least
 * the most recent agent responses.
 */
const applyHardTruncation = (
  conversation: ProcessedConversation,
  budget: ContextBudget
): ProcessedConversation => {
  const { previousEvents } = conversation;
  let currentTokens = estimateTimelineTokens(previousEvents);

  if (currentTokens <= budget.historyBudget) {
    return conversation;
  }

  // Find the minimum start index that preserves the last PRESERVED_RECENT_RESPONSES
  const totalResponses = countAgentResponses(previousEvents);
  const responsesToPreserve = Math.min(PRESERVED_RECENT_RESPONSES, totalResponses);
  let responsesFromEnd = 0;
  let minStartIdx = previousEvents.length;
  for (let i = previousEvents.length - 1; i >= 0; i--) {
    if (isProcessedAgentExecutionEvent(previousEvents[i])) {
      responsesFromEnd++;
      if (responsesFromEnd >= responsesToPreserve) {
        // Include any preceding user message
        minStartIdx = i > 0 && !isProcessedAgentExecutionEvent(previousEvents[i - 1]) ? i - 1 : i;
        break;
      }
    }
  }

  let start = 0;
  while (start < minStartIdx && currentTokens > budget.historyBudget) {
    currentTokens -= estimateEventTokens(previousEvents[start]);
    start++;
  }

  return {
    ...conversation,
    previousEvents: previousEvents.slice(start),
  };
};
