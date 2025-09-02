/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentService } from './agents';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { ToolsService } from './tools';

export interface StarterPrompt {
  description: string;
  title: string;
  icon: string;
  prompt: string;
}

export interface ConversationSettings {
  isFlyoutMode: boolean;
  settingsMenuComponent: React.ReactNode | undefined;
  selectedConversationId: string | undefined;
  newConversationSubtitle: string | undefined;
  newConversationPrompts: StarterPrompt[] | undefined;
  selectedConnectorId: string | undefined;
  setLastConversation: (lastConversation: LastConversation) => void;
  defaultAgentId: string | undefined;
}

export interface OnechatInternalService {
  agentService: AgentService;
  chatService: ChatService;
  conversationsService: ConversationsService;
  toolsService: ToolsService;
  conversationSettingsService: {
    setConversationSettings: (conversationSettings: ConversationSettings) => () => void;
    getConversationSettings$: () => any;
  };
}
