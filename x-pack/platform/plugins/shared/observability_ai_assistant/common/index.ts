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
  InferenceModelState,
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
  EIS_PRECONFIGURED_INFERENCE_IDS,
  LEGACY_CUSTOM_INFERENCE_ID,
} from './preconfigured_inference_ids';

export {
  GET_ALERTS_DATASET_INFO_FUNCTION_NAME,
  ALERTS_FUNCTION_NAME,
  QUERY_FUNCTION_NAME,
  EXECUTE_QUERY_FUNCTION_NAME,
  GET_DATA_ON_SCREEN_FUNCTION_NAME,
  CONTEXT_FUNCTION_NAME,
  ELASTICSEARCH_FUNCTION_NAME,
  EXECUTE_CONNECTOR_FUNCTION_NAME,
  GET_DATASET_INFO_FUNCTION_NAME,
  SELECT_RELEVANT_FIELDS_NAME,
  KIBANA_FUNCTION_NAME,
  SUMMARIZE_FUNCTION_NAME,
  VISUALIZE_QUERY_FUNCTION_NAME,
  CHANGES_FUNCTION_NAME,
  RETRIEVE_ELASTIC_DOC_FUNCTION_NAME,
  GET_APM_DATASET_INFO_FUNCTION_NAME,
  GET_APM_DOWNSTREAM_DEPENDENCIES_FUNCTION_NAME,
  GET_APM_SERVICES_LIST_FUNCTION_NAME,
  GET_APM_TIMESERIES_FUNCTION_NAME,
  LENS_FUNCTION_NAME,
} from './function_names';
