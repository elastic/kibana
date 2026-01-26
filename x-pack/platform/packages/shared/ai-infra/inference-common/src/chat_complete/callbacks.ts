/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from './events';

/**
 * Emitted once per completed LLM call
 */
export interface InferenceCallbackCompleteEvent {
  tokens?: ChatCompletionTokenCount;
  model?: string;
}

/**
 * Emitted once per error-ing LLM call
 */
export interface InferenceCallbackErrorEvent {
  error: Error;
}

export type InferenceCompleteCallbackHandler = (event: InferenceCallbackCompleteEvent) => void;
export type InferenceErrorCallbackHandler = (event: InferenceCallbackErrorEvent) => void;

export interface InferenceCallbacks {
  complete?: InferenceCompleteCallbackHandler | InferenceCompleteCallbackHandler[];
  error?: InferenceErrorCallbackHandler | InferenceErrorCallbackHandler[];
}

export interface InferenceEventEmitter {
  on(type: 'complete', handler: InferenceCompleteCallbackHandler): void;
  on(type: 'error', handler: InferenceErrorCallbackHandler): void;
}
