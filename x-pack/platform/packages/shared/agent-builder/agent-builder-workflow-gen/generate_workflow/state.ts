/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import type { Action, PrefetchedContext, ValidationResult } from './types';

export const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  additionalContext: Annotation<string | undefined>(),
  additionalInstructions: Annotation<string | undefined>(),
  maxRetries: Annotation<number>(),

  // prefetched context
  prefetched: Annotation<PrefetchedContext>(),

  // working buffers
  yaml: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  validationAttempts: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),

  // outputs
  validation: Annotation<ValidationResult | undefined>(),
});

export type StateType = typeof StateAnnotation.State;
