/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { ObservabilityAIAssistantPlugin } from './plugin';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ConfigSchema,
  ObservabilityAIAssistantService,
  ObservabilityAIAssistantChatService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
  DiscoveredDataset,
} from './types';
import elasticAiAssistantImg from './assets/elastic_ai_assistant.png';

export type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
  ObservabilityAIAssistantChatService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
  DiscoveredDataset,
};

export { aiAssistantCapabilities } from '../common/capabilities';
export { ConnectorSelectorBase } from './components/connector_selector/connector_selector_base';
export { useAbortableAsync, type AbortableAsyncState } from './hooks/use_abortable_async';
export { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';

export { createStorybookChatService, createStorybookService } from './storybook_mock';

export { createScreenContextAction } from './utils/create_screen_context_action';

export { ChatState } from './hooks/use_chat';

export { FeedbackButtons, type Feedback } from './components/buttons/feedback_buttons';
export { ChatItemControls } from './components/chat/chat_item_controls';

export { FailedToLoadResponse } from './components/message_panel/failed_to_load_response';

export { MessageText } from './components/message_panel/message_text';

export {
  type ChatActionClickHandler,
  ChatActionClickType,
  type ChatActionClickPayload,
} from './components/chat/types';

export {
  VisualizeESQLUserIntention,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '../common/functions/visualize_esql';

export {
  FunctionVisibility,
  MessageRole,
  KnowledgeBaseEntryRole,
  concatenateChatCompletionChunks,
  StreamingChatResponseEventType,
} from '../common';
export type {
  CompatibleJSONSchema,
  Conversation,
  Message,
  KnowledgeBaseEntry,
  FunctionDefinition,
  ChatCompletionChunkEvent,
  ShortIdTable,
} from '../common';

export { KnowledgeBaseType } from '../common';

export type { TelemetryEventTypeWithPayload } from './analytics';
export { ObservabilityAIAssistantTelemetryEventType } from './analytics/telemetry_event_type';

export { createFunctionRequestMessage } from '../common/utils/create_function_request_message';
export { createFunctionResponseMessage } from '../common/utils/create_function_response_message';

export type {
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
  APIReturnType,
} from './api';

export type { UseChatResult } from './hooks/use_chat';

export {
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
  aiAssistantPreferredAIAssistantType,
} from '../common/ui_settings/settings_keys';

export const elasticAiAssistantImage = elasticAiAssistantImg;

export const plugin: PluginInitializer<
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantPlugin(pluginInitializerContext);
