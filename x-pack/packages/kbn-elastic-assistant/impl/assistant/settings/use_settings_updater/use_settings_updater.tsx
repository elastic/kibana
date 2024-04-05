/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { PerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { Conversation, Prompt, QuickPrompt } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import type { KnowledgeBaseConfig } from '../../types';
import {
  ConversationsBulkActions,
  bulkChangeConversations,
} from '../../api/conversations/use_bulk_actions_conversations';
import { bulkChangeAnonymizationFields } from '../../api/anonymization_fields/use_bulk_anonymization_fields';

interface UseSettingsUpdater {
  assistantStreamingEnabled: boolean;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  updatedAnonymizationData: FindAnonymizationFieldsResponse;
  knowledgeBase: KnowledgeBaseConfig;
  quickPromptSettings: QuickPrompt[];
  resetSettings: () => void;
  systemPromptSettings: Prompt[];
  setUpdatedAnonymizationData: React.Dispatch<
    React.SetStateAction<FindAnonymizationFieldsResponse>
  >;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  anonymizationFieldsBulkActions: PerformBulkActionRequestBody;
  setAnonymizationFieldsBulkActions: React.Dispatch<
    React.SetStateAction<PerformBulkActionRequestBody>
  >;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setUpdatedAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  saveSettings: () => Promise<boolean>;
}

export const useSettingsUpdater = (
  conversations: Record<string, Conversation>,
  anonymizationFields: FindAnonymizationFieldsResponse
): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    allQuickPrompts,
    allSystemPrompts,
    assistantTelemetry,
    knowledgeBase,
    setAllQuickPrompts,
    setAllSystemPrompts,
    assistantStreamingEnabled,
    setAssistantStreamingEnabled,
    setKnowledgeBase,
    http,
    toasts,
  } = useAssistantContext();

  /**
   * Pending updating state
   */
  // Conversations
  const [conversationSettings, setConversationSettings] =
    useState<Record<string, Conversation>>(conversations);
  const [conversationsSettingsBulkActions, setConversationsSettingsBulkActions] =
    useState<ConversationsBulkActions>({});
  // Quick Prompts
  const [updatedQuickPromptSettings, setUpdatedQuickPromptSettings] =
    useState<QuickPrompt[]>(allQuickPrompts);
  // System Prompts
  const [updatedSystemPromptSettings, setUpdatedSystemPromptSettings] =
    useState<Prompt[]>(allSystemPrompts);
  // Anonymization
  const [anonymizationFieldsBulkActions, setAnonymizationFieldsBulkActions] =
    useState<PerformBulkActionRequestBody>({});
  const [updatedAnonymizationData, setUpdatedAnonymizationData] =
    useState<FindAnonymizationFieldsResponse>(anonymizationFields);
  const [updatedAssistantStreamingEnabled, setUpdatedAssistantStreamingEnabled] =
    useState<boolean>(assistantStreamingEnabled);
  // Knowledge Base
  const [updatedKnowledgeBaseSettings, setUpdatedKnowledgeBaseSettings] =
    useState<KnowledgeBaseConfig>(knowledgeBase);

  /**
   * Reset all pending settings
   */
  const resetSettings = useCallback((): void => {
    setConversationSettings(conversations);
    setConversationsSettingsBulkActions({});
    setUpdatedQuickPromptSettings(allQuickPrompts);
    setUpdatedKnowledgeBaseSettings(knowledgeBase);
    setUpdatedAssistantStreamingEnabled(assistantStreamingEnabled);
    setUpdatedSystemPromptSettings(allSystemPrompts);
    setUpdatedAnonymizationData(anonymizationFields);
  }, [
    allQuickPrompts,
    allSystemPrompts,
    anonymizationFields,
    assistantStreamingEnabled,
    conversations,
    knowledgeBase,
  ]);

  /**
   * Save all pending settings
   */
  const saveSettings = useCallback(async (): Promise<boolean> => {
    setAllQuickPrompts(updatedQuickPromptSettings);
    setAllSystemPrompts(updatedSystemPromptSettings);

    const hasBulkConversations =
      conversationsSettingsBulkActions.create ||
      conversationsSettingsBulkActions.update ||
      conversationsSettingsBulkActions.delete;
    const bulkResult = hasBulkConversations
      ? await bulkChangeConversations(http, conversationsSettingsBulkActions, toasts)
      : undefined;

    const didUpdateKnowledgeBase =
      knowledgeBase.isEnabledKnowledgeBase !== updatedKnowledgeBaseSettings.isEnabledKnowledgeBase;
    const didUpdateRAGAlerts =
      knowledgeBase.isEnabledRAGAlerts !== updatedKnowledgeBaseSettings.isEnabledRAGAlerts;
    const didUpdateAssistantStreamingEnabled =
      assistantStreamingEnabled !== updatedAssistantStreamingEnabled;
    if (didUpdateKnowledgeBase || didUpdateRAGAlerts || didUpdateAssistantStreamingEnabled) {
      assistantTelemetry?.reportAssistantSettingToggled({
        ...(didUpdateKnowledgeBase
          ? { isEnabledKnowledgeBase: updatedKnowledgeBaseSettings.isEnabledKnowledgeBase }
          : {}),
        ...(didUpdateRAGAlerts
          ? { isEnabledRAGAlerts: updatedKnowledgeBaseSettings.isEnabledRAGAlerts }
          : {}),
        ...(didUpdateAssistantStreamingEnabled
          ? { assistantStreamingEnabled: updatedAssistantStreamingEnabled }
          : {}),
      });
    }
    setAssistantStreamingEnabled(updatedAssistantStreamingEnabled);
    setKnowledgeBase(updatedKnowledgeBaseSettings);
    const hasBulkAnonymizationFields =
      anonymizationFieldsBulkActions.create ||
      anonymizationFieldsBulkActions.update ||
      anonymizationFieldsBulkActions.delete;
    const bulkAnonymizationFieldsResult = hasBulkAnonymizationFields
      ? await bulkChangeAnonymizationFields(http, anonymizationFieldsBulkActions, toasts)
      : undefined;

    return (bulkResult?.success ?? true) && (bulkAnonymizationFieldsResult?.success ?? true);
  }, [
    setAllQuickPrompts,
    updatedQuickPromptSettings,
    setAllSystemPrompts,
    updatedSystemPromptSettings,
    conversationsSettingsBulkActions,
    http,
    toasts,
    knowledgeBase.isEnabledKnowledgeBase,
    knowledgeBase.isEnabledRAGAlerts,
    updatedAssistantStreamingEnabled,
    updatedKnowledgeBaseSettings,
    assistantStreamingEnabled,
    setAssistantStreamingEnabled,
    setKnowledgeBase,
    anonymizationFieldsBulkActions,
    assistantTelemetry,
  ]);

  return {
    conversationSettings,
    conversationsSettingsBulkActions,
    knowledgeBase: updatedKnowledgeBaseSettings,
    assistantStreamingEnabled: updatedAssistantStreamingEnabled,
    quickPromptSettings: updatedQuickPromptSettings,
    resetSettings,
    systemPromptSettings: updatedSystemPromptSettings,
    saveSettings,
    updatedAnonymizationData,
    setUpdatedAnonymizationData,
    anonymizationFieldsBulkActions,
    setAnonymizationFieldsBulkActions,
    setUpdatedKnowledgeBaseSettings,
    setUpdatedAssistantStreamingEnabled,
    setUpdatedQuickPromptSettings,
    setUpdatedSystemPromptSettings,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  };
};
