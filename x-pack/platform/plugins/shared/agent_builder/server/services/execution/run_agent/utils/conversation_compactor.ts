/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  CompactionSummary,
  CompactionStructuredData,
  CompactionToolCallSummary,
} from '@kbn/agent-builder-common';
import { ChatEventType, TimelineEventType, isToolCallStep } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn } from '@kbn/agent-builder-server';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { ProcessedConversation } from './prepare_conversation';
import { dropTimelineRounds, groupTimelineRounds, type TimelineRound } from './context_timeline';
import type { ProcessedTimelineEvent } from './context_timeline';
import type { ContextBudget } from './context_budget';
import { shouldTriggerCompaction } from './context_budget';
import {
  coveredRoundIds,
  hasUncoveredPrefixRounds,
  isLegacySummary,
  takeRoundsWithinBudget,
} from './compaction_coverage';
import { estimateMessagesTokens, estimatePerRoundTokens } from './estimate_conversation_tokens';
import type { ToolCallResultTransformer } from './tool_summarization';
import { prepareMessages } from './to_langchain_messages';
import { serializeCompactionSummary } from './compaction_serialize';
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
  /**
   * Per-round token counts for the rounds of `processedConversation.timeline`, in round order.
   * Includes model context so the trigger, reporting and hard truncation reflect the agent prompt.
   */
  perRoundTokenCounts: number[];
  /**
   * Transformer applied to tool results when rendering rounds for the summariser.
   */
  resultTransformer: ToolCallResultTransformer;
  /**
   * Ids of the rounds the pre-change fold would have formed (see `legacyEligibleRoundIds`), used
   * to interpret a summary that predates `covered_round_ids`.
   */
  legacyEligibleRoundIds: ReadonlySet<string>;
  existingSummary?: CompactionSummary;
  logger: Logger;
  abortSignal?: AbortSignal;
  eventEmitter?: AgentEventEmitterFn;
}

export interface CompactedConversation {
  processedConversation: ProcessedConversation;
  /** The summary to persist: a new one when compaction ran, else the existing one (kept on failure). */
  summary?: CompactionSummary;
  compactionTriggered: boolean;
  /** Token count before compaction (only set when compactionTriggered is true) */
  tokensBefore?: number;
  /** Token count after compaction (only set when compactionTriggered is true) */
  tokensAfter?: number;
  /** Number of rounds the new summary covers (only set when compactionTriggered is true) */
  summarizedRoundCount?: number;
}

type Round = TimelineRound<ProcessedTimelineEvent>;

const withoutModelContext = (event: ProcessedTimelineEvent): ProcessedTimelineEvent => {
  if (event.type !== TimelineEventType.userMessage) {
    return event;
  }
  const { model_context: _modelContext, ...data } = event.data;
  return { ...event, data };
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
 * - agent_actions: human-readable description of each tool call
 *
 * Entity extraction (e.g. index names) is delegated to the LLM via
 * structured output so new entity types can be added without code changes.
 */
export const extractProgrammaticSummary = (
  rounds: Array<{ steps: ConversationRoundStep[] }>
): {
  tool_calls_summary: CompactionToolCallSummary[];
  agent_actions: string[];
} => {
  const toolCalls: CompactionToolCallSummary[] = [];
  const agentActions: string[] = [];

  for (const round of rounds) {
    for (const step of round.steps) {
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
// Main compaction pipeline
// ---------------------------------------------------------------------------

/**
 * Compaction pipeline:
 *
 * 1. Resolve what the existing summary covers (a set of round ids; legacy summaries through the
 *    pre-change membership rule) and what is uncovered.
 * 2. Trigger when the effective history exceeds the threshold, or when a legacy summary's prefix
 *    hides uncovered rounds (one-time rebuild).
 * 3. Summarise: LLM over the uncovered rounds only, in requests budgeted on their rendered size
 *    and building on the prior summary; programmatic extraction over the whole resulting
 *    covered set so no covered round loses its entries.
 * 4. Coverage never moves backward: new coverage = covered ∪ summarised.
 * 5. On failure, keep the existing summary applied and the uncovered rounds visible.
 * 6. Hard truncation over uncovered rounds when the result still exceeds the budget.
 */
export const compactConversation = async ({
  processedConversation,
  chatModel,
  contextBudget,
  perRoundTokenCounts,
  resultTransformer,
  legacyEligibleRoundIds: legacyEligibleIds,
  existingSummary,
  logger,
  abortSignal,
  eventEmitter,
}: CompactConversationOptions): Promise<CompactedConversation> => {
  const rounds = groupTimelineRounds(processedConversation.timeline);
  const tokensByRoundId = new Map(
    rounds.map((round, index) => [round.id, perRoundTokenCounts[index] ?? 0] as const)
  );
  const tokensOf = (subset: ReadonlyArray<{ id: string }>): number =>
    subset.reduce((total, round) => total + (tokensByRoundId.get(round.id) ?? 0), 0);

  const covered = coveredRoundIds({ summary: existingSummary, rounds, legacyEligibleIds });
  const uncovered = rounds.filter((round) => !covered.has(round.id));
  const rawTokens = tokensOf(rounds);
  const effectiveTokens = (existingSummary?.token_count ?? 0) + tokensOf(uncovered);
  const needsRebuild =
    existingSummary !== undefined &&
    isLegacySummary(existingSummary) &&
    hasUncoveredPrefixRounds(rounds, covered);

  if (!needsRebuild && !shouldTriggerCompaction(effectiveTokens, contextBudget)) {
    if (existingSummary) {
      return {
        processedConversation: applyExistingSummary(
          processedConversation,
          existingSummary,
          covered
        ),
        summary: existingSummary,
        compactionTriggered: false,
      };
    }
    return { processedConversation, compactionTriggered: false };
  }

  // The existing summary stays applied and the uncovered rounds stay visible; truncate them if
  // the prompt still does not fit. Nothing new is persisted. Used when there is nothing to
  // summarise and when summarisation fails (a rebuild is then retried on the next run).
  const keepExisting = (): CompactedConversation => {
    const base = existingSummary
      ? applyExistingSummary(processedConversation, existingSummary, covered)
      : processedConversation;
    const truncation = applyHardTruncation(
      base,
      uncovered,
      tokensByRoundId,
      roundsBudget(contextBudget, existingSummary)
    );
    return {
      processedConversation: truncation.conversation,
      summary: existingSummary,
      compactionTriggered: false,
    };
  };

  // Everything but the most recent rounds is a candidate. With too few rounds there is nothing to
  // summarise: do not report a compaction that cannot complete.
  const preserveCount = Math.min(PRESERVED_RECENT_ROUNDS, rounds.length);
  const roundsToSummarize = rounds.slice(0, rounds.length - preserveCount);
  if (roundsToSummarize.length === 0) {
    logger.debug('Compaction threshold exceeded but no rounds are eligible for summarization');
    return keepExisting();
  }

  logger.info(
    needsRebuild
      ? `Compaction triggered: rebuilding a legacy summary whose prefix hides ${
          rounds.length - uncovered.length
        } covered / ${uncovered.length} uncovered rounds`
      : `Compaction triggered: ${effectiveTokens} effective tokens (${rawTokens} raw) exceeds threshold of ${contextBudget.triggerThreshold}`
  );
  eventEmitter?.({
    type: ChatEventType.compactionStarted,
    data: { token_count_before: rawTokens },
  });

  const result = await summarizeOlderRounds({
    conversation: processedConversation,
    rounds,
    roundsToSummarize,
    covered,
    resultTransformer,
    chatModel,
    budget: contextBudget,
    logger,
    existingSummary,
    abortSignal,
  });

  if (!result) {
    // Summarisation failed: no completion event is reported, see `keepExisting`.
    return keepExisting();
  }

  const remaining = rounds.filter((round) => !result.covered.has(round.id));
  let afterTokens = tokensOf(remaining) + result.summary.token_count;
  let compacted = result.processedConversation;
  if (afterTokens > contextBudget.historyBudget) {
    const truncation = applyHardTruncation(
      compacted,
      remaining,
      tokensByRoundId,
      roundsBudget(contextBudget, result.summary)
    );
    compacted = truncation.conversation;
    afterTokens = truncation.tokens + result.summary.token_count;
    logger.debug('Applied hard truncation after summarization');
  } else {
    logger.debug(
      `Summarization sufficient: ${afterTokens} tokens (budget: ${contextBudget.historyBudget})`
    );
  }

  eventEmitter?.({
    type: ChatEventType.compactionCompleted,
    data: {
      token_count_after: afterTokens,
      summarized_round_count: result.summary.summarized_round_count,
    },
  });

  return {
    processedConversation: compacted,
    summary: result.summary,
    compactionTriggered: true,
    tokensBefore: rawTokens,
    tokensAfter: afterTokens,
    summarizedRoundCount: result.summary.summarized_round_count,
  };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const applyExistingSummary = (
  conversation: ProcessedConversation,
  summary: CompactionSummary,
  covered: ReadonlySet<string>
): ProcessedConversation => ({
  ...conversation,
  timeline: dropTimelineRounds(conversation.timeline, covered),
  compactionSummary: summary,
});

interface SummarizationResult {
  processedConversation: ProcessedConversation;
  summary: CompactionSummary;
  covered: Set<string>;
}

/**
 * Summarises `roundsToSummarize`. Coverage never moves backward: the new summary covers the old
 * set plus every round summarised now, and its deterministic fields (tool calls, actions) are
 * extracted over that whole covered set — a round already covered but outside
 * `roundsToSummarize` (e.g. in the preserved tail after a rebuild) keeps its entries. The LLM
 * only sees the rounds the existing summary does not cover. Returns undefined when the LLM
 * call failed.
 */
const summarizeOlderRounds = async ({
  conversation,
  rounds,
  roundsToSummarize,
  covered,
  resultTransformer,
  chatModel,
  budget,
  logger,
  existingSummary,
  abortSignal,
}: {
  conversation: ProcessedConversation;
  /** Every round of the timeline, in order — used to order the covered ids. */
  rounds: Round[];
  /** The prefix of `rounds` to summarise (never empty). */
  roundsToSummarize: Round[];
  covered: ReadonlySet<string>;
  resultTransformer: ToolCallResultTransformer;
  chatModel: InferenceChatModel;
  budget: ContextBudget;
  logger: Logger;
  existingSummary?: CompactionSummary;
  abortSignal?: AbortSignal;
}): Promise<SummarizationResult | undefined> => {
  const rawRounds = roundsToSummarize.filter((round) => !covered.has(round.id));
  const newCovered = new Set([...covered, ...roundsToSummarize.map((round) => round.id)]);
  const coveredRounds = rounds.filter((round) => newCovered.has(round.id));
  const programmatic = extractProgrammaticSummary(coveredRounds);

  try {
    const summarizerTokenCounts = await estimatePerRoundTokens(
      rawRounds.flatMap((round) => round.events).map(withoutModelContext),
      resultTransformer
    );
    const summarizerTokensByRoundId = new Map(
      rawRounds.map((round, index) => [round.id, summarizerTokenCounts[index] ?? 0] as const)
    );
    const llmOutput = await generateLlmSummary({
      conversation,
      rawRounds,
      summarizerTokensByRoundId,
      resultTransformer,
      programmatic,
      chatModel,
      budget,
      existingSummary,
      logger,
      abortSignal,
    });
    const structuredData: CompactionStructuredData = { ...llmOutput, ...programmatic };
    const summaryText = serializeCompactionSummary(structuredData);

    const coveredInOrder = coveredRounds.map((round) => round.id);
    const summary: CompactionSummary = {
      summarized_round_count: coveredInOrder.length,
      covered_round_ids: coveredInOrder,
      created_at: new Date().toISOString(),
      token_count: estimateTokens(summaryText),
      structured_data: structuredData,
    };
    return {
      processedConversation: {
        ...conversation,
        timeline: dropTimelineRounds(conversation.timeline, newCovered),
        compactionSummary: summary,
      },
      summary,
      covered: newCovered,
    };
  } catch (error) {
    logger.error(`Compaction summarization failed, keeping the existing summary: ${error}`);
    return undefined;
  }
};

/**
 * The LLM half of the summary. Each request is: system prompt, the running summary as prior
 * context, a chunk of raw rounds rendered exactly as sent (tool results through
 * `resultTransformer`), and the instruction with the programmatic tool list. Requests are
 * budgeted on their rendered size: the fixed part is measured per request, the chunk is sized
 * against what is left of `budget.historyBudget`, and the rendered request is re-measured,
 * shedding trailing rounds while it still exceeds the budget. A round that does not fit alone
 * is sent alone (logged). With no raw rounds a single request refreshes the summary from the prior.
 */
const generateLlmSummary = async ({
  conversation,
  rawRounds,
  summarizerTokensByRoundId,
  resultTransformer,
  programmatic,
  chatModel,
  budget,
  existingSummary,
  logger,
  abortSignal,
}: {
  conversation: ProcessedConversation;
  rawRounds: Round[];
  summarizerTokensByRoundId: ReadonlyMap<string, number>;
  resultTransformer: ToolCallResultTransformer;
  programmatic: { tool_calls_summary: CompactionToolCallSummary[]; agent_actions: string[] };
  chatModel: InferenceChatModel;
  budget: ContextBudget;
  existingSummary?: CompactionSummary;
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<LlmCompactionOutput> => {
  const structuredModel = chatModel.withStructuredOutput(llmCompactionSchema, {
    name: 'compact_conversation',
  });
  const { model_context: _modelContext, ...nextInputWithoutModelContext } = conversation.nextInput;

  const toolLines = programmatic.tool_calls_summary
    .map((tc) => `- ${tc.tool_id}(${tc.params_summary})`)
    .join('\n');
  const toolContext =
    programmatic.tool_calls_summary.length > 0
      ? `\n\nFor reference, here are the tool calls that were made (already captured separately):\n${toolLines}`
      : '';
  const instruction = `Please generate a structured summary of this conversation history.${toolContext}`;

  /** The request for `chunk` under `prior`, rendered the way it is sent. */
  const renderRequest = async (
    chunk: Round[],
    prior?: CompactionSummary
  ): Promise<BaseMessage[]> => {
    const history = await prepareMessages({
      conversation: {
        ...conversation,
        timeline: chunk.flatMap((round) => round.events).map(withoutModelContext),
        // Workflow model context is replayed verbatim with un-compacted rounds, but must not be
        // folded into the persisted summary after those original messages are removed.
        nextInput: nextInputWithoutModelContext,
      },
      compactionSummary: prior,
      resultTransformer,
    });
    return [new SystemMessage(COMPACTION_SYSTEM_PROMPT), ...history, new HumanMessage(instruction)];
  };

  let prior = existingSummary;
  let remaining = rawRounds;
  let output: LlmCompactionOutput;
  do {
    // Fixed cost of this request: system prompt, prior-summary block, next input, instruction.
    const fixedTokens = estimateMessagesTokens(await renderRequest([], prior));
    let chunk = takeRoundsWithinBudget(
      remaining,
      summarizerTokensByRoundId,
      budget.historyBudget - fixedTokens
    );
    let messages = await renderRequest(chunk, prior);
    // The estimate is an estimate: hold the budget on the rendered request.
    while (chunk.length > 1 && estimateMessagesTokens(messages) > budget.historyBudget) {
      chunk = chunk.slice(0, -1);
      messages = await renderRequest(chunk, prior);
    }
    const requestTokens = estimateMessagesTokens(messages);
    if (requestTokens > budget.historyBudget) {
      logger.warn(
        `Compaction summarizer request of ${requestTokens} tokens exceeds the history budget (${budget.historyBudget}): round ${chunk[0]?.id} does not fit on its own`
      );
    }
    remaining = remaining.slice(chunk.length);

    output = await structuredModel.invoke(messages, { signal: abortSignal });
    // Only `structured_data` is read by `prepareMessages`; the counters are placeholders here.
    prior = {
      summarized_round_count: 0,
      created_at: new Date().toISOString(),
      token_count: 0,
      structured_data: { ...output, ...programmatic },
    };
  } while (remaining.length > 0);
  return output;
};

/**
 * The history budget left for raw rounds once the summary (rendered alongside them) is accounted
 * for.
 */
const roundsBudget = (budget: ContextBudget, summary: CompactionSummary | undefined): number =>
  budget.historyBudget - (summary?.token_count ?? 0);

/**
 * Drops the oldest of `candidates` (the rounds still on the timeline, in order) until their
 * tokens fit `budget` (the history budget minus the summary they are rendered with, see
 * {@link roundsBudget}), never below the `PRESERVED_RECENT_ROUNDS` floor. At the floor the prompt
 * may still exceed the budget.
 */
const applyHardTruncation = (
  conversation: ProcessedConversation,
  candidates: Round[],
  tokensByRoundId: ReadonlyMap<string, number>,
  budget: number
): { conversation: ProcessedConversation; tokens: number } => {
  let tokens = candidates.reduce((total, round) => total + (tokensByRoundId.get(round.id) ?? 0), 0);
  if (tokens <= budget) {
    return { conversation, tokens };
  }
  const floor = Math.max(0, candidates.length - PRESERVED_RECENT_ROUNDS);
  const dropped = new Set<string>();
  for (let index = 0; index < floor && tokens > budget; index++) {
    dropped.add(candidates[index].id);
    tokens -= tokensByRoundId.get(candidates[index].id) ?? 0;
  }
  return {
    conversation: { ...conversation, timeline: dropTimelineRounds(conversation.timeline, dropped) },
    tokens,
  };
};
