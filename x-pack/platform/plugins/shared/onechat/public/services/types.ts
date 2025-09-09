/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { OnechatStartDependencies } from '../types';
import type { AgentService } from './agents';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { ToolsService } from './tools';
import type { AIConnector } from '../application/components/settings/connector_selector';

export interface StarterPrompt {
  description: string;
  title: string;
  icon: string;
  prompt: string;
}

export interface ConversationSettings {
  isFlyoutMode?: boolean;
  newConversationSubtitle?: string;
  newConversationPrompts?: StarterPrompt[];
  defaultAgentId?: string;
  commentActionsMounter?: (args: { message: { content: string } }) => React.JSX.Element;
  toolParameters?: Record<string, any>;
  onConnectorSelectionChange?: (connector: AIConnector) => void;
  customMenuItems?: React.ReactElement[];
  onSelectPrompt?: (prompt: string, title: string) => void;
  selectedConversationId?: string;
  selectedContextComponent?: React.ReactElement;
  contextPrompt?: string;
  transformUserContextPrompt?: (promptText: string) => any;
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
  startDependencies: OnechatStartDependencies;
}
