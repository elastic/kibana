/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessageLike } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AnswerAgentAction, ResearchAgentAction } from './actions';

export const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  cycleLimit: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 10,
  }),
  // internals
  resumeToStep: Annotation<string>(),

  /**
   * Timestamp for the current conversation round.
   * Used to keep prompts cache-friendly within a round.
   */
  conversationTimestamp: Annotation<string>({
    reducer: (a, b) => b,
    default: () => '',
  }),
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
  // outputs
  interrupted: Annotation<boolean>(),
  prompt: Annotation<PromptRequest>(),
  finalAnswer: Annotation<string>(),
});

export type StateType = typeof StateAnnotation.State;
