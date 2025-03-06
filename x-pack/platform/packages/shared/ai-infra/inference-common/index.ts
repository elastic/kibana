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
  type MessageContentImage,
  type MessageContentText,
  type MessageContent,
  type AssistantMessage,
  type ToolMessage,
  type UserMessage,
  type MessageOf,
  type AssistantMessageOf,
  type ToolMessageOf,
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
  type ChatCompleteCompositeResponse,
  type ChatCompletionTokenCountEvent,
  type ChatCompletionEvent,
  type ChatCompletionChunkEvent,
  type ChatCompletionChunkToolCall,
  type ChatCompletionMessageEvent,
  type ChatCompleteStreamResponse,
  type ChatCompleteResponse,
  type ChatCompletionTokenCount,
  type BoundChatCompleteAPI,
  type BoundChatCompleteOptions,
  type UnboundChatCompleteOptions,
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
  type ChatCompleteMetadata,
  type ConnectorTelemetryMetadata,
} from './src/chat_complete';
export {
  OutputEventType,
  type OutputAPI,
  type OutputOptions,
  type OutputResponse,
  type OutputCompositeResponse,
  type OutputStreamResponse,
  type OutputCompleteEvent,
  type OutputUpdateEvent,
  type Output,
  type OutputEvent,
  type BoundOutputAPI,
  type BoundOutputOptions,
  type UnboundOutputOptions,
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
  type InferenceTaskAbortedError,
  createInferenceInternalError,
  createInferenceRequestError,
  createInferenceRequestAbortedError,
  isInferenceError,
  isInferenceInternalError,
  isInferenceRequestError,
  isInferenceRequestAbortedError,
} from './src/errors';
export { generateFakeToolCallId } from './src/utils';
export { elasticModelDictionary } from './src/const';

export { truncateList } from './src/truncate_list';
export {
  InferenceConnectorType,
  isSupportedConnectorType,
  isSupportedConnector,
  getConnectorDefaultModel,
  getConnectorProvider,
  connectorToInference,
  type InferenceConnector,
} from './src/connectors';
export {
  defaultInferenceEndpoints,
  InferenceEndpointProvider,
  elasticModelIds,
} from './src/inference_endpoints';
