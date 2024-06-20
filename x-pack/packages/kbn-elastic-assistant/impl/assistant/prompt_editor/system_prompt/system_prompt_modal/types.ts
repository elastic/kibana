/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Conversation, Prompt } from '../../../../..';
import { ConversationsBulkActions } from '../../../api';

export interface SystemPromptSettingsProps {
  connectors: AIConnector[] | undefined;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: Prompt) => void;
  selectedSystemPrompt: Prompt | undefined;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: Prompt[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  defaultConnector?: AIConnector;
}
