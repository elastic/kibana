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
  CompactionEntity,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ProcessedConversation, ProcessedConversationRound } from './prepare_conversation';
import type { ContextBudget } from './context_budget';
import { estimateConversationTokens } from './context_budget';
import { convertPreviousRounds } from './to_langchain_messages';
import { llmCompactionSchema, COMPACTION_SYSTEM_PROMPT } from './compaction_schema';
import type { LlmCompactionOutput } from './compaction_schema';

/**
 * Number of most-recent rounds to always preserve verbatim (never compact).
 * These rounds give the LLM immediate context about the latest interaction.
 */
const PRESERVED_RECENT_ROUNDS = 2;

/** Max characters for a tool params summary before truncation */
const PARAMS_SUMMARY_MAX_LENGTH = 120;

export interface CompactConversationOptions {
  processedConversation: ProcessedConversation;
  chatModel: InferenceChatModel;
  contextBudget: ContextBudget;
  existingSummary?: CompactionSummary;
  logger: Logger;
}

export interface CompactedConversation {
  processedConversation: ProcessedConversation;
  summary?: CompactionSummary;
  compactionTriggered: boolean;
  /** Token count before compaction (only set when compactionTriggered is true) */
  tokensBefore?: number;
  /** Token count after compaction (only set when compactionTriggered is true) */
  tokensAfter?: number;
  /** Number of rounds that were summarized or removed */
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
 * Walks conversation rounds and extracts deterministic summary fields:
 * - tool_calls_summary: list of tool calls with their params
 * - entities: index names, fields, queries found in tool params
 * - agent_actions: human-readable description of each tool call
 */
export const extractProgrammaticSummary = (
  rounds: ProcessedConversationRound[]
): {
  tool_calls_summary: CompactionToolCallSummary[];
  entities: CompactionEntity[];
  agent_actions: string[];
} => {
  const toolCalls: CompactionToolCallSummary[] = [];
  const entities: CompactionEntity[] = [];
  const agentActions: string[] = [];
  const seenEntities = new Set<string>();

  for (const round of rounds) {
    for (const step of round.steps) {
      if (!isToolCallStep(step)) {
        continue;
      }

      const paramsSummary = summarizeParams(step.params);
      toolCalls.push({ tool_id: step.tool_id, params_summary: paramsSummary });
      agentActions.push(`Called ${step.tool_id}(${paramsSummary})`);

      extractEntitiesFromParams(step.params, entities, seenEntities);
    }
  }

  return {
    tool_calls_summary: toolCalls,
    entities,
    agent_actions: agentActions,
  };
};

/**
 * Extracts known entity types from tool call params.
 * Currently recognises index names and query strings; extend as needed.
 */
const extractEntitiesFromParams = (
  params: Record<string, unknown>,
  entities: CompactionEntity[],
  seen: Set<string>
): void => {
  const addEntity = (type: string, name: string) => {
    const key = `${type}:${name}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ type, name });
    }
  };

  // Index names
  if (typeof params.index === 'string') {
    addEntity('index', params.index);
  }
  if (typeof params.indices === 'string') {
    addEntity('index', params.indices);
  }
  if (Array.isArray(params.indices)) {
    for (const idx of params.indices) {
      if (typeof idx === 'string') {
        addEntity('index', idx);
      }
    }
  }

  // Query strings
  if (typeof params.query === 'string' && params.query.length > 0) {
    const truncatedQuery =
      params.query.length > 80 ? `${params.query.slice(0, 80)}…` : params.query;
    addEntity('query', truncatedQuery);
  }
};

// ---------------------------------------------------------------------------
// Main compaction pipeline
// ---------------------------------------------------------------------------

/**
 * Compaction pipeline with hybrid extraction:
 *
 * 1. Check whether compaction is needed (token threshold)
 * 2. Reuse an existing summary if it still fits
 * 3. Extract deterministic fields programmatically (tool calls, entities, actions)
 * 4. Call the LLM for semantic fields (summary, intent, outcomes, etc.)
 * 5. Merge both into CompactionStructuredData and persist
 * 6. Fall back to hard truncation if the result still exceeds the budget
 */
export const compactConversation = async ({
  processedConversation,
  chatModel,
  contextBudget,
  existingSummary,
  logger,
}: CompactConversationOptions): Promise<CompactedConversation> => {
  const { previousRounds } = processedConversation;

  // Compute the effective token count: what the LLM would actually see.
  // When an existing summary covers older rounds, only count the summary
  // plus the non-summarized rounds (not the raw total of all stored rounds).
  const effectiveTokens = existingSummary
    ? existingSummary.token_count +
      estimateConversationTokens(previousRounds.slice(existingSummary.summarized_round_count))
    : estimateConversationTokens(previousRounds);

  // Under threshold: apply existing summary if present (so the LLM sees
  // the compacted view) but don't report a new compaction event.
  if (effectiveTokens <= contextBudget.triggerThreshold) {
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

  const rawTokens = estimateConversationTokens(previousRounds);
  logger.info(
    `Compaction triggered: ${effectiveTokens} effective tokens (${rawTokens} raw) exceeds threshold of ${contextBudget.triggerThreshold}`
  );

  // Generate a new summary covering all older rounds via LLM + programmatic extraction
  const summarizationResult = await summarizeOlderRounds(
    processedConversation,
    chatModel,
    contextBudget,
    logger
  );

  if (summarizationResult.summary) {
    const afterTokens = estimateConversationTokens(
      summarizationResult.processedConversation.previousRounds
    );
    if (afterTokens <= contextBudget.historyBudget) {
      logger.debug(
        `Summarization sufficient: ${afterTokens} tokens (budget: ${contextBudget.historyBudget})`
      );
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
  const truncatedTokens = estimateConversationTokens(truncated.previousRounds);
  logger.debug('Applied hard truncation fallback');
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
    previousRounds: conversation.previousRounds.slice(summary.summarized_round_count),
    compactionSummary: summary,
  } as ProcessedConversation & { compactionSummary: CompactionSummary };
};

/**
 * Hybrid summarization: extracts deterministic fields programmatically,
 * calls the LLM for semantic fields, then merges both.
 */
const summarizeOlderRounds = async (
  conversation: ProcessedConversation,
  chatModel: InferenceChatModel,
  budget: ContextBudget,
  logger: Logger
): Promise<{ processedConversation: ProcessedConversation; summary?: CompactionSummary }> => {
  const { previousRounds } = conversation;
  const preserveCount = Math.min(PRESERVED_RECENT_ROUNDS, previousRounds.length);

  if (previousRounds.length <= preserveCount) {
    return { processedConversation: conversation };
  }

  const roundsToSummarize = previousRounds.slice(0, previousRounds.length - preserveCount);
  const recentRounds = previousRounds.slice(previousRounds.length - preserveCount);

  // Phase 1: programmatic extraction from older rounds
  const programmatic = extractProgrammaticSummary(roundsToSummarize);

  try {
    // Phase 2: LLM call for semantic fields
    const llmOutput = await generateLlmSummary(
      conversation,
      roundsToSummarize,
      programmatic,
      chatModel
    );

    // Phase 3: merge into CompactionStructuredData
    const structuredData: CompactionStructuredData = {
      ...llmOutput,
      ...programmatic,
    };

    const summaryText = serializeCompactionSummary(structuredData);
    const summaryTokenCount = estimateTokens(summaryText);

    const summary: CompactionSummary = {
      summarized_round_count: roundsToSummarize.length,
      created_at: new Date().toISOString(),
      token_count: summaryTokenCount,
      structured_data: structuredData,
    };

    const compactedConversation: ProcessedConversation & { compactionSummary: CompactionSummary } =
      {
        ...conversation,
        previousRounds: recentRounds,
        compactionSummary: summary,
      };

    return {
      processedConversation: compactedConversation as ProcessedConversation,
      summary,
    };
  } catch (error) {
    logger.error(`Compaction summarization failed, falling through to truncation: ${error}`);
    return { processedConversation: conversation };
  }
};

/**
 * Calls the LLM with a focused schema containing only semantic fields.
 * The programmatic tool call list is injected into the prompt as context
 * so the LLM can reference it without needing to reproduce it.
 */
const generateLlmSummary = async (
  conversation: ProcessedConversation,
  roundsToSummarize: ProcessedConversationRound[],
  programmatic: {
    tool_calls_summary: CompactionToolCallSummary[];
    entities: CompactionEntity[];
    agent_actions: string[];
  },
  chatModel: InferenceChatModel
): Promise<LlmCompactionOutput> => {
  const tempConversation: ProcessedConversation = {
    ...conversation,
    previousRounds: roundsToSummarize.slice(0, -1),
    nextInput: roundsToSummarize[roundsToSummarize.length - 1]?.input ?? conversation.nextInput,
  };

  const historyMessages = await convertPreviousRounds({
    conversation: tempConversation,
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

  return await structuredModel.invoke(messages);
};

/**
 * Drop oldest rounds one by one until the conversation
 * fits within the history budget. Always preserves at least
 * the most recent rounds.
 */
const applyHardTruncation = (
  conversation: ProcessedConversation,
  budget: ContextBudget
): ProcessedConversation => {
  const rounds = [...conversation.previousRounds];

  while (rounds.length > PRESERVED_RECENT_ROUNDS) {
    const currentTokens = estimateConversationTokens(rounds);
    if (currentTokens <= budget.historyBudget) {
      break;
    }
    rounds.shift();
  }

  return {
    ...conversation,
    previousRounds: rounds,
  };
};
