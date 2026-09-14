/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { CompactionSummary } from '@kbn/agent-builder-common';
import type { AnswerAgentAction, ResearchAgentAction } from './actions';

/**
 * What the compaction summary covers. In-flight actions have no timeline event id yet, so
 * coverage inside the current round is expressed as an action index until round complete.
 */
export type CompactionCoverage = { eventId: string } | { actionIndex: number };

export type CompactionSummaryData = Omit<CompactionSummary, 'summarized_up_to_event_id'>;

export const StateAnnotation = Annotation.Root({
  // inputs
  cycleLimit: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 10,
  }),
  // internals
  resumeToStep: Annotation<string>(),
  currentCycle: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 0,
  }),
  // counter to keep track of the number of successive errors
  errorCount: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 0,
  }),
  // list of actions/steps performed by the main agent
  mainActions: Annotation<ResearchAgentAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // list of actions/steps performed by the answer agent
  answerActions: Annotation<AnswerAgentAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // context management
  compactionSummary: Annotation<CompactionSummaryData | undefined>({
    reducer: (a, b) => b,
    default: () => undefined,
  }),
  compactionCoverage: Annotation<CompactionCoverage | undefined>({
    reducer: (a, b) => b,
    default: () => undefined,
  }),
  lastCallUsage: Annotation<{ inputTokens: number } | undefined>({
    reducer: (a, b) => b,
    default: () => undefined,
  }),
  lastContextActionCycle: Annotation<number>({
    reducer: (a, b) => b,
    default: () => Number.NEGATIVE_INFINITY,
  }),
  contextRetryCount: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 0,
  }),
  // outputs
  interrupted: Annotation<boolean>(),
  prompts: Annotation<PromptRequest[]>({
    reducer: (a, b) => [...(a ?? []), ...b],
    default: () => [],
  }),
  finalAnswer: Annotation<string>(),
});

export type StateType = typeof StateAnnotation.State;
