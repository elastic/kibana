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
  type ToolCallbacksOf,
  type ToolCall,
  type ToolDefinition,
  type ToolOptions,
  type FunctionCallingMode,
  type ToolChoice,
  type ChatCompleteAPI,
  type ChatCompleteAPIResponse,
  type ChatCompleteOptions,
  type ChatCompleteCompositeResponse,
  type ChatCompletionTokenCountEvent,
  type ChatCompletionEvent,
  type ChatCompletionChunkEvent,
  type ChatCompletionChunkToolCall,
  type ChatCompletionMessageEvent,
  type ChatCompleteStreamResponse,
  type ChatCompleteResponse,
  type ChatCompleteRetryConfiguration,
  type ChatCompletionTokenCount,
  type BoundChatCompleteAPI,
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
  type AnonymizationRule,
  type RegexAnonymizationRule,
  type NamedEntityRecognitionRule,
  type AnonymizationEntity,
  type Anonymization,
  type Deanonymization,
  type AnonymizationOutput,
  type DeanonymizationOutput,
  type DeanonymizedMessage,
  type AnonymizationSettings,
  type AnonymizationRegexWorkerTaskPayload,
} from './src/chat_complete';

export type { BoundInferenceClient, InferenceClient } from './src/inference_client';
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
  type InferenceTaskProviderError,
  createInferenceInternalError,
  createInferenceRequestError,
  createInferenceRequestAbortedError,
  createInferenceProviderError,
  isInferenceError,
  isInferenceInternalError,
  isInferenceRequestError,
  isInferenceRequestAbortedError,
  isInferenceProviderError,
} from './src/errors';

export { Tokenizer, generateFakeToolCallId, ShortIdTable } from './src/utils';

export { elasticModelDictionary } from './src/const';

export { truncateList } from './src/truncate_list';
export {
  InferenceConnectorType,
  isSupportedConnectorType,
  isSupportedConnector,
  getConnectorDefaultModel,
  getConnectorModel,
  getConnectorFamily,
  getConnectorPlatform,
  getConnectorProvider,
  connectorToInference,
  getModelDefinition,
  getContextWindowSize,
  contextWindowFromModelName,
  type InferenceConnector,
  type InferenceConnectorCapabilities,
} from './src/connectors';
export {
  defaultInferenceEndpoints,
  InferenceEndpointProvider,
  elasticModelIds,
} from './src/inference_endpoints';

export { type Model, ModelFamily, ModelPlatform, ModelProvider } from './src/model_provider';

export {
  type BoundPromptAPI,
  type Prompt,
  type PromptAPI,
  type PromptCompositeResponse,
  type PromptFactory,
  type PromptOptions,
  type PromptResponse,
  type PromptStreamResponse,
  type PromptVersion,
  type ToolOptionsOfPrompt,
  type UnboundPromptOptions,
  createPrompt,
} from './src/prompt';

export { type BoundOptions, type UnboundOptions, bindApi } from './src/bind';

export { aiAssistantAnonymizationSettings } from './src/ui_settings/settings_keys';
