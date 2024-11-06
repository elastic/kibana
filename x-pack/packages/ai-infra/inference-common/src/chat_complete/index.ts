/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ChatCompleteCompositeResponse,
  ChatCompleteAPI,
  ChatCompleteOptions,
  FunctionCallingMode,
  ChatCompleteStreamResponse,
  ChatCompleteResponse,
} from './api';
export {
  ChatCompletionEventType,
  type ChatCompletionMessageEvent,
  type ChatCompletionChunkEvent,
  type ChatCompletionEvent,
  type ChatCompletionChunkToolCall,
  type ChatCompletionTokenCountEvent,
  type ChatCompletionTokenCount,
} from './events';
export {
  MessageRole,
  type Message,
  type AssistantMessage,
  type UserMessage,
  type ToolMessage,
} from './messages';
export { type ToolSchema, type ToolSchemaType, type FromToolSchema } from './tool_schema';
export {
  ToolChoiceType,
  type ToolOptions,
  type ToolDefinition,
  type ToolCall,
  type ToolCallsOf,
  type UnvalidatedToolCall,
  type ToolChoice,
} from './tools';
export {
  isChatCompletionChunkEvent,
  isChatCompletionEvent,
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
  withoutChunkEvents,
  withoutTokenCountEvents,
} from './event_utils';
export {
  ChatCompletionErrorCode,
  type ChatCompletionToolNotFoundError,
  type ChatCompletionToolValidationError,
  type ChatCompletionTokenLimitReachedError,
  isToolValidationError,
  isTokenLimitReachedError,
  isToolNotFoundError,
} from './errors';
