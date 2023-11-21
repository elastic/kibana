/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

export type ConversationRole = 'system' | 'user' | 'assistant';

export interface MessagePresentation {
  delay?: number;
  stream?: boolean;
}
export interface Message {
  role: ConversationRole;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  content?: string;
  timestamp: string;
  isError?: boolean;
  presentation?: MessagePresentation;
}

export interface ConversationTheme {
  title?: JSX.Element | string;
  titleIcon?: string;
  user?: {
    name?: string;
    icon?: string;
  };
  assistant?: {
    name?: string;
    icon?: string;
  };
  system?: {
    name?: string;
    icon?: string;
  };
}

/**
 * Complete state to reconstruct a conversation instance.
 * Includes all messages, connector configured, and relevant UI state.
 *
 */
export interface Conversation {
  apiConfig: {
    connectorId?: string;
    connectorTypeTitle?: string;
    defaultSystemPromptId?: string;
    provider?: OpenAiProviderType;
    model?: string;
  };
  id: string;
  messages: Message[];
  replacements?: Record<string, string>;
  theme?: ConversationTheme;
  isDefault?: boolean;
  excludeFromLastConversationStorage?: boolean;
}

export interface AssistantTelemetry {
  reportAssistantInvoked: (params: { invokedBy: string; conversationId: string }) => void;
  reportAssistantMessageSent: (params: { conversationId: string; role: string }) => void;
  reportAssistantQuickPrompt: (params: { conversationId: string; promptTitle: string }) => void;
}

export interface AssistantAvailability {
  // True when user is Enterprise, or Security Complete PLI for serverless. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
  // When true, user has `All` privilege for `Connectors and Actions` (show/execute/delete/save ui capabilities)
  hasConnectorsAllPrivilege: boolean;
  // When true, user has `Read` privilege for `Connectors and Actions` (show/execute ui capabilities)
  hasConnectorsReadPrivilege: boolean;
}
