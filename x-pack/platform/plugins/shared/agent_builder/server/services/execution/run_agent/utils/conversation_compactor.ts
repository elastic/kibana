/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  CompactionCursor,
  CompactionSummary,
  CompactionStructuredData,
  CompactionToolCallSummary,
  ToolCallWithResult,
} from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { COMPACTION_TAIL_FLOOR_TOKENS } from '../constants';
import type { CurrentRun } from '../transient_state';
import type { ProcessedConversation } from './prepare_conversation';
import type { ContextBudget } from './context_budget';
import {
  fullyCoveredRoundIds,
  listVisibleUnits,
  resolveVisibility,
  unitAnchor,
  unitToolCalls,
  type ContextUnit,
} from './context_coverage';
import { estimateMessagesTokens } from './estimate_conversation_tokens';
import { compactionSummaryMessages } from './to_langchain_messages';
import {
  buildContextView,
  renderUnit,
  roundUserMessage,
  type VisibleContextDeps,
} from './visible_context';
import { serializeCompactionSummary } from './compaction_serialize';
import { llmCompactionSchema, COMPACTION_SYSTEM_PROMPT } from './compaction_schema';
import type { LlmCompactionOutput } from './compaction_schema';

/** Max characters for a tool params summary before truncation */
const PARAMS_SUMMARY_MAX_LENGTH = 120;

export interface CompactContextInput {
  conversation: ProcessedConversation;
  /** The current run; its `compactionSummary` is the summary to build on. */
  run: CurrentRun;
  /** Max tokens of completed cycles kept verbatim before the current one. */
  tailCapTokens: number;
  /**
   * Whether to still compact when the summarizer fails, with only the programmatic fields added:
   * the covered cycles are then lost to the model for good.
   */
  fallbackOnFailure: boolean;
}

export interface CompactContextDeps extends VisibleContextDeps {
  chatModel: InferenceChatModel;
  budget: ContextBudget;
  abortSignal?: AbortSignal;
}

export interface CompactContextResult {
  summary: CompactionSummary;
  tokensBefore: number;
  tokensAfter: number;
  summarizedCycleCount: number;
}

type ProgrammaticSummary = Pick<CompactionStructuredData, 'tool_calls_summary' | 'agent_actions'>;

// ---------------------------------------------------------------------------
// Programmatic extraction helpers
// ---------------------------------------------------------------------------

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
 * Deterministic summary fields for the given tool calls. Entity extraction is delegated to the
 * LLM via structured output so new entity types can be added without code changes.
 */
export const extractProgrammaticSummary = (
  toolCalls: Array<Pick<ToolCallWithResult, 'tool_id' | 'params'>>
): ProgrammaticSummary => {
  const toolCallsSummary: CompactionToolCallSummary[] = [];
  const agentActions: string[] = [];

  for (const toolCall of toolCalls) {
    const paramsSummary = summarizeParams(toolCall.params);
    toolCallsSummary.push({ tool_id: toolCall.tool_id, params_summary: paramsSummary });
    agentActions.push(`Called ${toolCall.tool_id}(${paramsSummary})`);
  }

  return { tool_calls_summary: toolCallsSummary, agent_actions: agentActions };
};

// ---------------------------------------------------------------------------
// Compaction pipeline
// ---------------------------------------------------------------------------

interface RenderedUnit {
  unit: ContextUnit;
  messages: BaseMessage[];
  tokens: number;
}

/**
 * Summarizes everything but a token-banded tail of the visible context.
 *
 * 1. Split what the existing summary leaves visible into cycles: history cycles, then the
 *    current run's.
 * 2. Keep the current run's last cycle unconditionally and walk backwards while the preserved
 *    tail stays under `tailCapTokens`; everything before is covered, up to the last cycle that has
 *    a stable anchor for the cursor.
 * 3. Summarize the covered cycles on top of the existing summary, in requests budgeted on their
 *    rendered size; the programmatic tool-call fields accumulate across compactions. When the
 *    summarizer fails and `fallbackOnFailure` is set, the covered cycles are still dropped, with
 *    only the programmatic fields added to the existing summary.
 *
 * Returns `undefined` when there is nothing to compact, the summarizer failed without fallback or
 * the run was aborted.
 */
export const compactContext = async (
  { conversation, run, tailCapTokens, fallbackOnFailure }: CompactContextInput,
  deps: CompactContextDeps
): Promise<CompactContextResult | undefined> => {
  const existingSummary = run.compactionSummary;
  const view = buildContextView({ conversation, run }, deps);
  const rendered: RenderedUnit[] = [];
  for (const unit of listVisibleUnits({
    entries: view.history.entries,
    steps: run.steps,
    visibility: view.visibility,
  })) {
    const messages = await renderUnit(unit, { view, run, conversation });
    rendered.push({ unit, messages, tokens: estimateMessagesTokens(messages) });
  }

  // At round start with no current step, the last unit is history and can be covered too.
  const pinnedCount = rendered.at(-1)?.unit.kind === 'current_cycle' ? 1 : 0;
  if (rendered.length <= pinnedCount) {
    deps.logger.debug(`[compactor] no-op: ${rendered.length} visible unit(s)`);
    return undefined;
  }

  let tailTokens = 0;
  let firstPreserved = rendered.length - pinnedCount;
  for (let i = firstPreserved - 1; i >= 0; i--) {
    if (tailTokens + rendered[i].tokens > tailCapTokens) {
      break;
    }
    tailTokens += rendered[i].tokens;
    firstPreserved = i;
  }

  // The cursor needs a stable anchor: stop the covered range at the last unit that has one.
  let coveredCount = firstPreserved;
  let cursor: CompactionCursor | undefined;
  while (coveredCount > 0 && !cursor) {
    cursor = unitAnchor(rendered[coveredCount - 1].unit, run);
    if (!cursor) {
      coveredCount--;
    }
  }

  const tokensBefore =
    rendered.reduce((sum, { tokens }) => sum + tokens, 0) + (existingSummary?.token_count ?? 0);
  if (!cursor || tokensBefore < COMPACTION_TAIL_FLOOR_TOKENS) {
    deps.logger.debug(
      `[compactor] no-op: units=${rendered.length} covered=${coveredCount} tokensBefore=${tokensBefore} tailCap=${tailCapTokens} floor=${COMPACTION_TAIL_FLOOR_TOKENS}`
    );
    return undefined;
  }
  const covered = rendered.slice(0, coveredCount);
  const preserved = rendered.slice(coveredCount);
  deps.logger.debug(
    `[compactor] covering ${covered.length}/${
      rendered.length
    } cycle(s) tokensBefore=${tokensBefore} existingSummaryTokens=${
      existingSummary?.token_count ?? 0
    }`
  );

  const added = extractProgrammaticSummary(
    covered.flatMap(({ unit }) => unitToolCalls(unit, run.steps))
  );
  const programmatic: ProgrammaticSummary = {
    tool_calls_summary: [
      ...(existingSummary?.structured_data.tool_calls_summary ?? []),
      ...added.tool_calls_summary,
    ],
    agent_actions: [
      ...(existingSummary?.structured_data.agent_actions ?? []),
      ...added.agent_actions,
    ],
  };

  let llmOutput: LlmCompactionOutput;
  try {
    llmOutput = await generateLlmSummary({
      covered,
      conversation,
      userMessage: view.history.input.message,
      programmatic,
      existingSummary,
      deps,
    });
  } catch (error) {
    if (deps.abortSignal?.aborted) {
      return undefined;
    }
    if (!fallbackOnFailure) {
      deps.logger.error(`Compaction summarization failed, skipping the compaction: ${error}`);
      return undefined;
    }
    deps.logger.error(
      `Compaction summarization failed, falling back to the programmatic summary: ${error}`
    );
    llmOutput = fallbackLlmOutput({ existingSummary, userMessage: view.history.input.message });
  }

  const structuredData: CompactionStructuredData = { ...llmOutput, ...programmatic };
  const coveredRoundIds = fullyCoveredRoundIds(
    view.history.entries,
    resolveVisibility({
      entries: view.history.entries,
      roundId: run.roundId,
      steps: run.steps,
      cursor,
    })
  );
  const summary: CompactionSummary = {
    summarized_up_to: cursor,
    summarized_round_count: coveredRoundIds.length,
    covered_round_ids: coveredRoundIds,
    created_at: new Date().toISOString(),
    token_count: estimateTokens(serializeCompactionSummary(structuredData)),
    structured_data: structuredData,
  };

  return {
    summary,
    tokensBefore,
    tokensAfter: preserved.reduce((sum, { tokens }) => sum + tokens, 0) + summary.token_count,
    summarizedCycleCount: covered.length,
  };
};

/** The LLM half of the summary when the summarizer failed: the existing one, else placeholders. */
const fallbackLlmOutput = ({
  existingSummary,
  userMessage,
}: {
  existingSummary?: CompactionSummary;
  userMessage: string;
}): LlmCompactionOutput => {
  if (existingSummary) {
    const {
      discussion_summary: discussionSummary,
      user_intent: userIntent,
      entities,
      key_topics: keyTopics,
      outcomes_and_decisions: outcomesAndDecisions,
      unanswered_questions: unansweredQuestions,
    } = existingSummary.structured_data;
    return {
      discussion_summary: discussionSummary,
      user_intent: userIntent,
      entities,
      key_topics: keyTopics,
      outcomes_and_decisions: outcomesAndDecisions,
      unanswered_questions: unansweredQuestions,
    };
  }
  return {
    discussion_summary:
      'The earlier part of this conversation could not be summarized; only the tool calls made are listed.',
    user_intent: userMessage,
    entities: [],
    key_topics: [],
    outcomes_and_decisions: [],
    unanswered_questions: [],
  };
};

/** The longest prefix of `units` within `budget`; always at least the first one. */
const takeWithinBudget = (units: RenderedUnit[], budget: number): RenderedUnit[] => {
  const taken: RenderedUnit[] = [];
  let total = 0;
  for (const unit of units) {
    if (taken.length > 0 && total + unit.tokens > budget) {
      break;
    }
    taken.push(unit);
    total += unit.tokens;
  }
  return taken;
};

/**
 * The LLM half of the summary. Each request is: system prompt, the running summary as prior
 * context, a chunk of covered cycles rendered as they are sent (preceded by its round's user
 * message when it starts mid-round), the user's current request and the instruction with the
 * programmatic tool list.
 * Requests are budgeted on their rendered size: the fixed part is measured per request, the chunk
 * is sized against what is left of `budget.historyBudget`, and the request is re-measured,
 * shedding trailing cycles while it still exceeds the budget. A cycle that does not fit alone is
 * sent alone (logged).
 */
const generateLlmSummary = async ({
  covered,
  conversation,
  userMessage,
  programmatic,
  existingSummary,
  deps: { chatModel, budget, logger, abortSignal },
}: {
  covered: RenderedUnit[];
  conversation: ProcessedConversation;
  userMessage: string;
  programmatic: ProgrammaticSummary;
  existingSummary?: CompactionSummary;
  deps: CompactContextDeps;
}): Promise<LlmCompactionOutput> => {
  const structuredModel = chatModel.withStructuredOutput(llmCompactionSchema, {
    name: 'compact_conversation',
  });

  const toolLines = programmatic.tool_calls_summary
    .map((tc) => `- ${tc.tool_id}(${tc.params_summary})`)
    .join('\n');
  const toolContext =
    programmatic.tool_calls_summary.length > 0
      ? `\n\nFor reference, here are the tool calls that were made (already captured separately):\n${toolLines}`
      : '';
  const instruction = `Please generate a structured summary of this conversation history.${toolContext}`;

  const chunkLead = ([first]: RenderedUnit[]): BaseMessage[] =>
    first?.unit.kind === 'round_cycle' && !first.unit.first
      ? [roundUserMessage(first.unit, conversation)]
      : [];

  const renderRequest = (chunk: RenderedUnit[], prior?: CompactionSummary): BaseMessage[] => [
    new SystemMessage(COMPACTION_SYSTEM_PROMPT),
    ...(prior ? compactionSummaryMessages(prior) : []),
    ...chunkLead(chunk),
    ...chunk.flatMap(({ messages }) => messages),
    createUserMessage(userMessage),
    new HumanMessage(instruction),
  ];

  let prior = existingSummary;
  let remaining = covered;
  let output: LlmCompactionOutput;
  do {
    const fixedTokens = estimateMessagesTokens(renderRequest([], prior));
    let chunk = takeWithinBudget(remaining, budget.historyBudget - fixedTokens);
    let messages = renderRequest(chunk, prior);
    // The estimate is an estimate: hold the budget on the rendered request.
    while (chunk.length > 1 && estimateMessagesTokens(messages) > budget.historyBudget) {
      chunk = chunk.slice(0, -1);
      messages = renderRequest(chunk, prior);
    }
    const requestTokens = estimateMessagesTokens(messages);
    if (requestTokens > budget.historyBudget) {
      logger.warn(
        `Compaction summarizer request of ${requestTokens} tokens exceeds the history budget (${budget.historyBudget}): a cycle does not fit on its own`
      );
    }
    remaining = remaining.slice(chunk.length);

    try {
      output = await structuredModel.invoke(messages, { signal: abortSignal });
    } catch (error) {
      if (abortSignal?.aborted) {
        throw error;
      }
      logger.warn(`Compaction summarizer request failed, retrying once: ${error}`);
      output = await structuredModel.invoke(messages, { signal: abortSignal });
    }
    // Only `structured_data` is read when rendering the prior; the other fields are placeholders.
    prior = {
      summarized_round_count: 0,
      created_at: new Date().toISOString(),
      token_count: 0,
      structured_data: { ...output, ...programmatic },
    };
  } while (remaining.length > 0);
  return output;
};
