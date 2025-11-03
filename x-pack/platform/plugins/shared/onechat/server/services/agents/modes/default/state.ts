/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import type { AgentAction, AnswerAgentAction, ResearchAgentAction } from './actions';

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
  currentCycle: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 0,
  }),
  maxCycleReached: Annotation<boolean>(),
  nextMessage: Annotation<AIMessage>(), // TODO: remove
  handoverNote: Annotation<string>(), // TODO: remove
  mainActions: Annotation<ResearchAgentAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  answerActions: Annotation<AnswerAgentAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // outputs
  finalAnswer: Annotation<string>(),
});

export type StateType = typeof StateAnnotation.State;
