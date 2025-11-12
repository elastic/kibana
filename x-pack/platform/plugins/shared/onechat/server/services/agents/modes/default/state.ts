/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';

export const DEFAULT_CYCLE_LIMIT = 10;

export const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  cycleLimit: Annotation<number>({
    reducer: (a, b) => b,
    default: () => DEFAULT_CYCLE_LIMIT,
  }),
  // internals
  currentCycle: Annotation<number>({
    reducer: (a, b) => b,
    default: () => 0,
  }),
  nextMessage: Annotation<AIMessage>(),
  maxCycleReached: Annotation<boolean>(),
  handoverNote: Annotation<string>(),
  // outputs
  addedMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;