/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { applyStepUpdates, type RunStepUpdate } from './step_state';
import {
  mergeToolRenderState,
  type AnswerOutcome,
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
