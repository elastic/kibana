/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';

export type ConversationRole = 'system' | 'user' | 'assistant';

export interface MessagePresentation {
  delay?: number;
  stream?: boolean;
}
export interface Message {
  role: ConversationRole;
  content: string;
  timestamp: string;
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
