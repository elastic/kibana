/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { Message, Conversation, KnowledgeBaseEntry, ConversationCreateRequest } from './types';
export {
  KnowledgeBaseEntryRole,
  MessageRole,
  ConversationAccess,
  KnowledgeBaseType,
  KnowledgeBaseState,
} from './types';
export type { FunctionDefinition, CompatibleJSONSchema } from './functions/types';
export {
  VISUALIZE_ESQL_USER_INTENTIONS,
  VisualizeESQLUserIntention,
} from './functions/visualize_esql';

export type {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  MessageAddEvent,
  ChatCompletionErrorEvent,
  BufferFlushEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventWithoutError,
} from './conversation_complete';
export {
  StreamingChatResponseEventType,
  ChatCompletionErrorCode,
  ChatCompletionError,
  createTokenLimitReachedError,
  createConversationNotFoundError,
  createInternalServerError,
  isTokenLimitReachedError,
  isChatCompletionError,
  createFunctionNotFoundError,
} from './conversation_complete';

export {
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
} from './ui_settings/settings_keys';

export { concatenateChatCompletionChunks } from './utils/concatenate_chat_completion_chunks';

export { ShortIdTable } from './utils/short_id_table';

export {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  ELSER_IN_EIS_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
  E5_LARGE_IN_EIS_INFERENCE_ID,
  EIS_PRECONFIGURED_INFERENCE_IDS,
} from './preconfigured_inference_ids';
