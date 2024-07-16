/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { PerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import {
  PerformBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { FindPromptsResponse } from '@kbn/elastic-assistant-common/impl/schemas/prompts/find_prompts_route.gen';
import { Conversation } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import type { KnowledgeBaseConfig } from '../../types';
import {
  ConversationsBulkActions,
  bulkUpdateConversations,
} from '../../api/conversations/bulk_update_actions_conversations';
import { bulkUpdateAnonymizationFields } from '../../api/anonymization_fields/bulk_update_anonymization_fields';
import { bulkUpdatePrompts } from '../../api/prompts/bulk_update_prompts';

interface UseSettingsUpdater {
  assistantStreamingEnabled: boolean;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  updatedAnonymizationData: FindAnonymizationFieldsResponse;
  knowledgeBase: KnowledgeBaseConfig;
  quickPromptSettings: PromptResponse[];
  resetSettings: () => void;
  systemPromptSettings: PromptResponse[];
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
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  setUpdatedAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  saveSettings: () => Promise<boolean>;
}

export const useSettingsUpdater = (
  conversations: Record<string, Conversation>,
  allPrompts: FindPromptsResponse,
  conversationsLoaded: boolean,
  anonymizationFields: FindAnonymizationFieldsResponse
): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    assistantTelemetry,
    knowledgeBase,
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
  const [quickPromptSettings, setUpdatedQuickPromptSettings] = useState<PromptResponse[]>(
    allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
  );
  // System Prompts
  const [systemPromptSettings, setUpdatedSystemPromptSettings] = useState<PromptResponse[]>(
    allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.system)
  );
  // Anonymization
  const [anonymizationFieldsBulkActions, setAnonymizationFieldsBulkActions] =
    useState<PerformBulkActionRequestBody>({});
  // Prompts
  const [promptsBulkActions, setPromptsBulkActions] = useState<PromptsPerformBulkActionRequestBody>(
    {}
  );
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
    setUpdatedQuickPromptSettings(
      allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.quick)
    );
    setUpdatedKnowledgeBaseSettings(knowledgeBase);
    setUpdatedAssistantStreamingEnabled(assistantStreamingEnabled);
    setUpdatedSystemPromptSettings(
      allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.system)
    );
    setUpdatedAnonymizationData(anonymizationFields);
  }, [allPrompts, anonymizationFields, assistantStreamingEnabled, conversations, knowledgeBase]);

  const hasBulkConversations =
    conversationsSettingsBulkActions.create ||
    conversationsSettingsBulkActions.update ||
    conversationsSettingsBulkActions.delete;

  const hasBulkAnonymizationFields =
    anonymizationFieldsBulkActions.create ||
    anonymizationFieldsBulkActions.update ||
    anonymizationFieldsBulkActions.delete;

  const hasBulkPrompts =
    promptsBulkActions.create || promptsBulkActions.update || promptsBulkActions.delete;
  /**
   * Save all pending settings
   */
  const saveSettings = useCallback(async (): Promise<boolean> => {
    const bulkPromptsResult = hasBulkPrompts
      ? await bulkUpdatePrompts(http, promptsBulkActions, toasts)
      : undefined;

    // replace conversation references for created
    if (bulkPromptsResult) {
      bulkPromptsResult.attributes.results.created.forEach((p) => {
        if (conversationsSettingsBulkActions.create) {
          Object.values(conversationsSettingsBulkActions.create).forEach((c) => {
            if (c.apiConfig?.defaultSystemPromptId === p.name) {
              c.apiConfig.defaultSystemPromptId = p.id;
            }
          });
        }
        if (conversationsSettingsBulkActions.update) {
          Object.values(conversationsSettingsBulkActions.update).forEach((c) => {
            if (c.apiConfig?.defaultSystemPromptId === p.name) {
              c.apiConfig.defaultSystemPromptId = p.id;
            }
          });
        }
      });
    }

    const bulkResult = hasBulkConversations
      ? await bulkUpdateConversations(http, conversationsSettingsBulkActions, toasts)
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

    const bulkAnonymizationFieldsResult = hasBulkAnonymizationFields
      ? await bulkUpdateAnonymizationFields(http, anonymizationFieldsBulkActions, toasts)
      : undefined;

    return (
      (bulkResult?.success ?? true) &&
      (bulkAnonymizationFieldsResult?.success ?? true) &&
      (bulkPromptsResult?.success ?? true)
    );
  }, [
    hasBulkConversations,
    http,
    conversationsSettingsBulkActions,
    toasts,
    knowledgeBase.isEnabledKnowledgeBase,
    knowledgeBase.isEnabledRAGAlerts,
    updatedKnowledgeBaseSettings,
    assistantStreamingEnabled,
    updatedAssistantStreamingEnabled,
    setAssistantStreamingEnabled,
    setKnowledgeBase,
    hasBulkAnonymizationFields,
    anonymizationFieldsBulkActions,
    hasBulkPrompts,
    promptsBulkActions,
    assistantTelemetry,
  ]);

  useEffect(() => {
    if (
      !(
        anonymizationFieldsBulkActions.create?.length ||
        anonymizationFieldsBulkActions.update?.length ||
        anonymizationFieldsBulkActions.delete?.ids?.length
      )
    )
      setUpdatedAnonymizationData(anonymizationFields);
  }, [
    anonymizationFields,
    anonymizationFieldsBulkActions.create?.length,
    anonymizationFieldsBulkActions.delete?.ids?.length,
    anonymizationFieldsBulkActions.update?.length,
  ]);

  useEffect(() => {
    // Update conversation settings when conversations are loaded
    if (conversationsLoaded) {
      setConversationSettings(conversations);
    }
  }, [conversations, conversationsLoaded]);

  return {
    conversationSettings,
    conversationsSettingsBulkActions,
    knowledgeBase: updatedKnowledgeBaseSettings,
    assistantStreamingEnabled: updatedAssistantStreamingEnabled,
    quickPromptSettings,
    resetSettings,
    systemPromptSettings,
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
    promptsBulkActions,
    setPromptsBulkActions,
  };
};
