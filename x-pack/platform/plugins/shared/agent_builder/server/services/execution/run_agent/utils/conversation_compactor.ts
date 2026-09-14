/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  CompactionStructuredData,
  CompactionToolCallSummary,
  ToolCallWithResult,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { COMPACTION_TAIL_FLOOR_TOKENS } from '../constants';
import type { ResearchAgentAction } from '../actions';
import type { CompactionCoverage, CompactionSummaryData } from '../state';
import type { ProcessedConversation } from './prepare_conversation';
import {
  groupTimelineCycles,
  sliceTimelineAfterEvent,
  type ProcessedTimelineEvent,
  type TimelineCycle,
} from './context_timeline';
import { estimateMessagesTokens } from './estimate_conversation_tokens';
import { compactionSummaryMessages } from './to_langchain_messages';
import {
  createContextTransformer,
  firstVisibleActionIndex,
  groupActionCycles,
  reconstructInFlightToolCalls,
  renderActionCycle,
  renderTimelineCycle,
  type ActionCycle,
  type VisibleContextDeps,
} from './visible_context';
import { serializeCompactionSummary } from './compaction_serialize';
import { llmCompactionSchema, COMPACTION_SYSTEM_PROMPT } from './compaction_schema';
import type { LlmCompactionOutput } from './compaction_schema';

/** Max characters for a tool params summary before truncation */
const PARAMS_SUMMARY_MAX_LENGTH = 120;

export interface CompactContextInput {
  conversation: ProcessedConversation;
  actions: ResearchAgentAction[];
  cycleLimit: number;
  existingSummary?: CompactionSummaryData;
  existingCoverage?: CompactionCoverage;
  /** Max tokens of completed cycles kept verbatim before the current one. */
  tailCapTokens: number;
}

export interface CompactContextDeps extends VisibleContextDeps {
  chatModel: InferenceChatModel;
  abortSignal?: AbortSignal;
}

export interface CompactContextResult {
  summary: CompactionSummaryData;
  coverage: CompactionCoverage;
  tokensBefore: number;
  tokensAfter: number;
  summarizedCycleCount: number;
}

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
 * Deterministic summary fields for the covered tool calls. Entity extraction is delegated to
 * the LLM via structured output so new entity types can be added without code changes.
 */
export const extractProgrammaticSummary = (
  toolCalls: ToolCallWithResult[]
): {
  tool_calls_summary: CompactionToolCallSummary[];
  agent_actions: string[];
} => {
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

type Unit =
  | { kind: 'timeline'; cycle: TimelineCycle<ProcessedTimelineEvent>; tokens: number }
  | { kind: 'action'; cycle: ActionCycle; tokens: number };

/**
 * Summarizes everything but a token-banded tail of recent cycles.
 *
 * 1. Split the visible context (after any existing coverage) into cycles: timeline cycles from
 *    previous rounds, then in-flight action cycles.
 * 2. Keep the current (last) cycle unconditionally and walk backwards while the preserved tail
 *    stays under `tailCapTokens`; everything before is covered.
 * 3. Summarize the covered cycles (programmatic tool-call extraction + LLM structured output,
 *    building on the existing summary) and return the new coverage cursor.
 *
 * Returns `undefined` when there is nothing to compact or the summarizer failed.
 */
export const compactContext = async (
  input: CompactContextInput,
  deps: CompactContextDeps
): Promise<CompactContextResult | undefined> => {
  const { conversation, actions, cycleLimit, existingSummary, existingCoverage, tailCapTokens } =
    input;
  const resultTransformer = createContextTransformer({ conversation, actions }, deps);
  const renderOptions = { cycleLimit, resultTransformer, toolManager: deps.toolManager };

  const timeline = visibleTimeline(conversation.timeline, existingCoverage);
  const firstAction = firstVisibleActionIndex(existingCoverage);

  const units: Unit[] = [];
  for (const cycle of groupTimelineCycles(timeline)) {
    const messages = await renderTimelineCycle(cycle, { resultTransformer });
    units.push({ kind: 'timeline', cycle, tokens: estimateMessagesTokens(messages) });
  }
  for (const cycle of groupActionCycles(actions).filter((c) => c.start >= firstAction)) {
    const messages = await renderActionCycle(actions, cycle, renderOptions);
    units.push({
      kind: 'action',
      cycle,
      tokens: estimateMessagesTokens(messages as BaseMessage[]),
    });
  }

  // Only the current cycle is left: nothing can be covered.
  if (units.length <= 1) {
    return undefined;
  }

  let tailTokens = 0;
  let firstPreserved = units.length - 1;
  for (let i = units.length - 2; i >= 0; i--) {
    if (tailTokens + units[i].tokens > tailCapTokens) {
      break;
    }
    tailTokens += units[i].tokens;
    firstPreserved = i;
  }
  const covered = units.slice(0, firstPreserved);
  const tokensBefore =
    units.reduce((sum, unit) => sum + unit.tokens, 0) + (existingSummary?.token_count ?? 0);
  if (covered.length === 0 || tokensBefore < COMPACTION_TAIL_FLOOR_TOKENS) {
    return undefined;
  }

  const coveredMessages: BaseMessageLike[] = [];
  for (const unit of covered) {
    coveredMessages.push(
      ...(unit.kind === 'timeline'
        ? await renderTimelineCycle(unit.cycle, { resultTransformer })
        : await renderActionCycle(actions, unit.cycle, renderOptions))
    );
  }
  const programmatic = extractProgrammaticSummary(
    coveredToolCalls(covered, actions, deps.toolManager.getToolIdMapping())
  );

  try {
    const llmOutput = await generateLlmSummary({
      coveredMessages,
      userMessage: conversation.nextInput.message,
      programmatic,
      existingSummary,
      chatModel: deps.chatModel,
      abortSignal: deps.abortSignal,
    });

    const structuredData: CompactionStructuredData = { ...llmOutput, ...programmatic };
    const summary: CompactionSummaryData = {
      created_at: new Date().toISOString(),
      token_count: estimateTokens(serializeCompactionSummary(structuredData)),
      structured_data: structuredData,
    };

    const last = covered[covered.length - 1];
    const coverage: CompactionCoverage =
      last.kind === 'timeline'
        ? { eventId: last.cycle.lastEventId }
        : { actionIndex: last.cycle.end };

    return {
      summary,
      coverage,
      tokensBefore,
      tokensAfter: tailTokens + units[units.length - 1].tokens + summary.token_count,
      summarizedCycleCount: covered.length,
    };
  } catch (error) {
    deps.logger.error(`Compaction summarization failed: ${error}`);
    return undefined;
  }
};

const visibleTimeline = (
  timeline: ProcessedTimelineEvent[],
  coverage?: CompactionCoverage
): ProcessedTimelineEvent[] => {
  if (!coverage) return timeline;
  return 'eventId' in coverage ? sliceTimelineAfterEvent(timeline, coverage.eventId) : [];
};

const coveredToolCalls = (
  covered: Unit[],
  actions: ResearchAgentAction[],
  toolIdMapping: Map<string, string>
): ToolCallWithResult[] =>
  covered.flatMap((unit) =>
    unit.kind === 'timeline'
      ? unit.cycle.steps.filter(isToolCallStep)
      : reconstructInFlightToolCalls(actions, toolIdMapping, unit.cycle)
  );

/**
 * The LLM only sees the covered cycles (plus the existing summary as prior context and the
 * round's triggering user message, which anchors mid-round chunks that have no user turn of
 * their own). The programmatic tool-call list is passed as reference so it isn't reproduced.
 */
const generateLlmSummary = async ({
  coveredMessages,
  userMessage,
  programmatic,
  existingSummary,
  chatModel,
  abortSignal,
}: {
  coveredMessages: BaseMessageLike[];
  userMessage: string;
  programmatic: { tool_calls_summary: CompactionToolCallSummary[]; agent_actions: string[] };
  existingSummary?: CompactionSummaryData;
  chatModel: InferenceChatModel;
  abortSignal?: AbortSignal;
}): Promise<LlmCompactionOutput> => {
  const toolLines = programmatic.tool_calls_summary
    .map((tc) => `- ${tc.tool_id}(${tc.params_summary})`)
    .join('\n');
  const toolContext =
    programmatic.tool_calls_summary.length > 0
      ? `\n\nFor reference, here are the tool calls that were made (already captured separately):\n${toolLines}`
      : '';

  const messages: BaseMessageLike[] = [
    ['system', COMPACTION_SYSTEM_PROMPT],
    ...(existingSummary ? compactionSummaryMessages(existingSummary) : []),
    createUserMessage(userMessage),
    ...coveredMessages,
    ['user', `Please generate a structured summary of this conversation history.${toolContext}`],
  ];

  const structuredModel = chatModel.withStructuredOutput(llmCompactionSchema, {
    name: 'compact_conversation',
  });

  return await structuredModel.invoke(messages, { signal: abortSignal });
};
