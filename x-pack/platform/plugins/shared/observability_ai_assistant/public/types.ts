/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type {
  ChatCompletionChunkEvent,
  MessageAddEvent,
  StreamingChatResponseEventWithoutError,
} from '../common/conversation_complete';
import type { FunctionDefinition, FunctionResponse } from '../common/functions/types';
import type {
  Message,
  ObservabilityAIAssistantScreenContext,
  PendingMessage,
  AdHocInstruction,
} from '../common/types';
import type { TelemetryEventTypeWithPayload } from './analytics';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type { ChatActionClickHandler } from './components/chat/types';
import type { InsightProps } from './components/insight/insight';
import { ObservabilityAIAssistantChatServiceContext } from './context/observability_ai_assistant_chat_service_context';
import { ObservabilityAIAssistantMultipaneFlyoutContext } from './context/observability_ai_assistant_multipane_flyout_context';
import { useChat } from './hooks/use_chat';
import type { UseGenAIConnectorsResult } from './hooks/use_genai_connectors';
import { useObservabilityAIAssistantChatService } from './hooks/use_observability_ai_assistant_chat_service';
import { createScreenContextAction } from './utils/create_screen_context_action';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export type { PendingMessage };

export interface DiscoveredDataset {
  title: string;
  description: string;
  indexPatterns: string[];
  columns: unknown[];
}

export interface ObservabilityAIAssistantChatService {
  sendAnalyticsEvent: (event: TelemetryEventTypeWithPayload) => void;
  chat: (
    name: string,
    options: {
      messages: Message[];
      connectorId: string;
      functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
      functionCall?: string;
      signal: AbortSignal;
      scopes: AssistantScope[];
    }
  ) => Observable<ChatCompletionChunkEvent>;
  complete: (options: {
    getScreenContexts: () => ObservabilityAIAssistantScreenContext[];
    conversationId?: string;
    connectorId: string;
    messages: Message[];
    persist: boolean;
    disableFunctions:
      | boolean
      | {
          except: string[];
        };
    signal: AbortSignal;
    instructions?: AdHocInstruction[];
    scopes: AssistantScope[];
  }) => Observable<StreamingChatResponseEventWithoutError>;
  getFunctions: (options?: {
    contexts?: string[];
    filter?: string;
    scopes: AssistantScope[];
  }) => FunctionDefinition[];
  functions$: BehaviorSubject<FunctionDefinition[]>;
  hasFunction: (name: string) => boolean;
  getSystemMessage: () => Message;
  hasRenderFunction: (name: string) => boolean;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string },
    onActionClick: ChatActionClickHandler
  ) => React.ReactNode;
  getScopes: () => AssistantScope[];
}

export interface ObservabilityAIAssistantConversationService {
  openNewConversation: ({}: {
    messages: Message[];
    title?: string;
    hideConversationList?: boolean;
  }) => void;
  predefinedConversation$: Observable<{
    messages: Message[];
    title?: string;
    hideConversationList?: boolean;
  }>;
}

export interface ObservabilityAIAssistantService {
  callApi: ObservabilityAIAssistantAPIClient;
  isEnabled: () => boolean;
  start: ({}: { signal: AbortSignal }) => Promise<ObservabilityAIAssistantChatService>;
  register: (fn: ChatRegistrationRenderFunction) => void;
  setScreenContext: (screenContext: ObservabilityAIAssistantScreenContext) => () => void;
  getScreenContexts: () => ObservabilityAIAssistantScreenContext[];
  conversations: ObservabilityAIAssistantConversationService;
  navigate: (callback: () => void) => Promise<Observable<MessageAddEvent>>;
  scope$: BehaviorSubject<AssistantScope[]>;
  setScopes: (scope: AssistantScope[]) => void;
  getScopes: () => AssistantScope[];
}

export type RenderFunction<TArguments, TResponse extends FunctionResponse> = (options: {
  arguments: TArguments;
  response: TResponse;
  onActionClick: ChatActionClickHandler;
}) => React.ReactNode;

export type RegisterRenderFunctionDefinition<
  TFunctionArguments = any,
  TFunctionResponse extends FunctionResponse = any
> = (name: string, render: RenderFunction<TFunctionArguments, TFunctionResponse>) => void;

export type ChatRegistrationRenderFunction = ({}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) => Promise<void>;

export interface ConfigSchema {
  scope?: AssistantScope;
}

export interface ObservabilityAIAssistantPluginSetupDependencies {
  licensing: {};
  security: SecurityPluginSetup;
}

export interface ObservabilityAIAssistantPluginStartDependencies {
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
}

export interface ObservabilityAIAssistantPublicSetup {}

export interface ObservabilityAIAssistantPublicStart {
  service: ObservabilityAIAssistantService;
  ObservabilityAIAssistantContextualInsight: React.ForwardRefExoticComponent<InsightProps> | null;
  ObservabilityAIAssistantMultipaneFlyoutContext: typeof ObservabilityAIAssistantMultipaneFlyoutContext;
  ObservabilityAIAssistantChatServiceContext: typeof ObservabilityAIAssistantChatServiceContext;
  useObservabilityAIAssistantChatService: typeof useObservabilityAIAssistantChatService;
  useGenAIConnectors: () => UseGenAIConnectorsResult;
  useChat: typeof useChat;
  getContextualInsightMessages: ({}: { message: string; instructions: string }) => Message[];
  createScreenContextAction: typeof createScreenContextAction;
}
