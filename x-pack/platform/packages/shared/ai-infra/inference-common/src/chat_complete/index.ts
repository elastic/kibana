/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ChatCompleteCompositeResponse,
  ChatCompleteAPI,
  ChatCompleteAPIResponse,
  ChatCompleteOptions,
  FunctionCallingMode,
  ChatCompleteStreamResponse,
  ChatCompleteResponse,
  ChatCompleteRetryConfiguration,
} from './api';
export type { BoundChatCompleteAPI, UnboundChatCompleteOptions } from './bound_api';
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
  type MessageContent,
  type MessageContentImage,
  type MessageContentText,
  type Message,
  type AssistantMessage,
  type UserMessage,
  type ToolMessage,
  type AssistantMessageOf,
  type MessageOf,
  type ToolMessageOf,
} from './messages';
export { type ToolSchema, type ToolSchemaType, type FromToolSchema } from './tool_schema';
export {
  ToolChoiceType,
  type ToolCallback,
  type ToolOptions,
  type ToolDefinition,
  type ToolCall,
  type UnvalidatedToolCall,
  type ToolChoice,
  type CustomToolChoice,
  type ToolCallArguments,
  type ToolCallbackResult,
} from './tools';

export type {
  ToolCallArgumentsOfToolDefinition,
  ToolCallOfToolDefinitions,
  ToolCallOfToolOptions,
  ToolCallbacksOfToolOptions,
  ToolNamesOf,
  ToolsOfChoice,
  ToolCallsOfToolOptions,
} from './tools_of';

export type { ChatCompleteMetadata, ConnectorTelemetryMetadata } from './metadata';
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
  isOutputTokenLimitReachedError,
  isToolNotFoundError,
} from './errors';

export type {
  AnonymizationRule,
  AnonymizationEntity,
  Anonymization,
  Deanonymization,
  AnonymizationOutput,
  DeanonymizationOutput,
  DeanonymizedMessage,
  RegexAnonymizationRule,
  NamedEntityRecognitionRule,
  AnonymizationSettings,
} from './anonymization';

export type {
  InferenceCallbacks,
  InferenceCallbackErrorEvent,
  InferenceCallbackSuccessEvent,
  InferenceCompleteCallbackHandler,
  InferenceErrorCallbackHandler,
} from './callbacks';
