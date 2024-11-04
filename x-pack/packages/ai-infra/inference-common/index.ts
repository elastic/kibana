/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  MessageRole,
  ChatCompletionEventType,
  ToolChoiceType,
  type Message,
  type AssistantMessage,
  type ToolMessage,
  type UserMessage,
  type ToolSchemaType,
  type FromToolSchema,
  type ToolSchema,
  type UnvalidatedToolCall,
  type ToolCallsOf,
  type ToolCall,
  type ToolDefinition,
  type ToolOptions,
  type FunctionCallingMode,
  type ToolChoice,
  type ChatCompleteAPI,
  type ChatCompleteOptions,
  type ChatCompletionResponse,
  type ChatCompletionTokenCountEvent,
  type ChatCompletionEvent,
  type ChatCompletionChunkEvent,
  type ChatCompletionChunkToolCall,
  type ChatCompletionMessageEvent,
  withoutTokenCountEvents,
  withoutChunkEvents,
  isChatCompletionMessageEvent,
  isChatCompletionEvent,
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
  ChatCompletionErrorCode,
  type ChatCompletionToolNotFoundError,
  type ChatCompletionToolValidationError,
  type ChatCompletionTokenLimitReachedError,
  isToolValidationError,
  isTokenLimitReachedError,
  isToolNotFoundError,
} from './src/chat_complete';
export {
  OutputEventType,
  type OutputAPI,
  type OutputResponse,
  type OutputCompleteEvent,
  type OutputUpdateEvent,
  type Output,
  type OutputEvent,
  isOutputCompleteEvent,
  isOutputUpdateEvent,
  isOutputEvent,
  withoutOutputUpdateEvents,
} from './src/output';
export {
  InferenceTaskEventType,
  type InferenceTaskEvent,
  type InferenceTaskEventBase,
} from './src/inference_task';
export {
  InferenceTaskError,
  InferenceTaskErrorCode,
  type InferenceTaskErrorEvent,
  type InferenceTaskInternalError,
  type InferenceTaskRequestError,
  createInferenceInternalError,
  createInferenceRequestError,
  isInferenceError,
  isInferenceInternalError,
  isInferenceRequestError,
} from './src/errors';
