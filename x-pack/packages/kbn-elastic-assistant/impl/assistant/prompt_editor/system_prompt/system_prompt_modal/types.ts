/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PromptResponse,
  PerformBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Conversation } from '../../../../..';
import { ConversationsBulkActions } from '../../../api';

export interface SystemPromptSettingsProps {
  connectors: AIConnector[] | undefined;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: PromptResponse) => void;
  selectedSystemPrompt: PromptResponse | undefined;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: PromptResponse[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  defaultConnector?: AIConnector;
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
}
