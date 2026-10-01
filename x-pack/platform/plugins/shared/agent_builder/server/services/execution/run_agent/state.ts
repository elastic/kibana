/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { CompactionSummary, ConversationRoundStep } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { applyStepUpdates, type RunStepUpdate } from './step_state';
import {
  mergeToolRenderState,
  type AnswerOutcome,
  type CompactionRequest,
  type CurrentRun,
  type ResearchOutcome,
  type RetryNotice,
  type ToolOutcome,
  type ToolRenderStateMap,
  type ToolRenderStateUpdate,
} from './transient_state';

const lastValue =
  <T>() =>
  (_current: T, next: T): T =>
    next;

export const StateAnnotation = Annotation.Root({
  // inputs
  cycleLimit: Annotation<number>({ reducer: lastValue<number>(), default: () => 10 }),
  /** The round the run's steps are persisted under (the paused one on a resume). */
  roundId: Annotation<string>({ reducer: lastValue<string>(), default: () => '' }),
  // internal state
  currentCycle: Annotation<number>({ reducer: lastValue<number>(), default: () => 0 }),
  // counter to keep track of the number of successive errors
  errorCount: Annotation<number>({ reducer: lastValue<number>(), default: () => 0 }),
  /**
   * The authoritative record of the run. Nodes emit `RunStepUpdate[]`; the reducer folds them.
   * Seeded at init through `new Overwrite(steps)` so the reducer is bypassed for the initial value.
   */
  steps: Annotation<ConversationRoundStep[], RunStepUpdate[]>({
    reducer: applyStepUpdates,
    default: () => [],
  }),
  // transient routing/rendering state
  researchOutcome: Annotation<ResearchOutcome | undefined>({
    reducer: lastValue<ResearchOutcome | undefined>(),
    default: () => undefined,
  }),
  answerOutcome: Annotation<AnswerOutcome | undefined>({
    reducer: lastValue<AnswerOutcome | undefined>(),
    default: () => undefined,
  }),
  toolOutcome: Annotation<ToolOutcome | undefined>({
    reducer: lastValue<ToolOutcome | undefined>(),
    default: () => undefined,
  }),
  /** Tool calls issued by the model and not yet executed; the only marker of "pending". */
  pendingToolCallIds: Annotation<string[]>({ reducer: lastValue<string[]>(), default: () => [] }),
  toolRenderState: Annotation<ToolRenderStateMap, ToolRenderStateUpdate>({
    reducer: mergeToolRenderState,
    default: () => ({}),
  }),
  retryNotices: Annotation<RetryNotice[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  // context management
  /** The conversation's compaction summary, seeded from the stored one and replaced on compaction. */
  compactionSummary: Annotation<CompactionSummary | undefined>({
    reducer: lastValue<CompactionSummary | undefined>(),
    default: () => undefined,
  }),
  /** Usage of the last research call, the proactive context management trigger. */
  lastCallUsage: Annotation<{ inputTokens: number } | undefined>({
    reducer: lastValue<{ inputTokens: number } | undefined>(),
    default: () => undefined,
  }),
  /** Cycle of the last compaction or substitution, for the cooldown. */
  lastContextActionCycle: Annotation<number>({
    reducer: lastValue<number>(),
    default: () => Number.NEGATIVE_INFINITY,
  }),
  /** Successive context-length errors recovered from by a forced compaction. */
  contextRetryCount: Annotation<number>({ reducer: lastValue<number>(), default: () => 0 }),
  compactionRequest: Annotation<CompactionRequest | undefined>({
    reducer: lastValue<CompactionRequest | undefined>(),
    default: () => undefined,
  }),
  // outputs
  interrupted: Annotation<boolean>({ reducer: lastValue<boolean>(), default: () => false }),
  prompts: Annotation<PromptRequest[]>({
    reducer: (current, next) => [...(current ?? []), ...next],
    default: () => [],
  }),
  finalAnswer: Annotation<string | object | undefined>({
    reducer: lastValue<string | object | undefined>(),
    default: () => undefined,
  }),
});

export type StateType = typeof StateAnnotation.State;
export type StateUpdate = typeof StateAnnotation.Update;

/** The view of the graph state the prompt layer renders the current run from. */
export const toCurrentRun = (state: StateType): CurrentRun => ({
  roundId: state.roundId,
  steps: state.steps,
  cycleLimit: state.cycleLimit,
  renderState: state.toolRenderState,
  pendingToolCallIds: state.pendingToolCallIds,
  retryNotices: state.retryNotices,
  compactionSummary: state.compactionSummary,
});
