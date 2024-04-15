/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { Conversation, Prompt, QuickPrompt } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import type { KnowledgeBaseConfig } from '../../types';
import {
  ConversationsBulkActions,
  bulkChangeConversations,
} from '../../api/conversations/use_bulk_actions_conversations';

interface UseSettingsUpdater {
  assistantStreamingEnabled: boolean;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  knowledgeBase: KnowledgeBaseConfig;
  quickPromptSettings: QuickPrompt[];
  resetSettings: () => void;
  systemPromptSettings: Prompt[];
  setUpdatedDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setUpdatedAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  saveSettings: () => Promise<boolean>;
}

export const useSettingsUpdater = (
  conversations: Record<string, Conversation>
): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    allQuickPrompts,
    allSystemPrompts,
    assistantTelemetry,
    defaultAllow,
    defaultAllowReplacement,
    knowledgeBase,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setDefaultAllow,
    setDefaultAllowReplacement,
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
  const [updatedDefaultAllow, setUpdatedDefaultAllow] = useState<string[]>(defaultAllow);
  const [updatedDefaultAllowReplacement, setUpdatedDefaultAllowReplacement] =
    useState<string[]>(defaultAllowReplacement);
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
    setUpdatedDefaultAllow(defaultAllow);
    setUpdatedDefaultAllowReplacement(defaultAllowReplacement);
  }, [
    allQuickPrompts,
    allSystemPrompts,
    assistantStreamingEnabled,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
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
    setDefaultAllow(updatedDefaultAllow);
    setDefaultAllowReplacement(updatedDefaultAllowReplacement);

    return bulkResult?.success ?? true;
  }, [
    setAllQuickPrompts,
    updatedQuickPromptSettings,
    setAllSystemPrompts,
    updatedSystemPromptSettings,
    http,
    conversationsSettingsBulkActions,
    toasts,
    knowledgeBase.isEnabledKnowledgeBase,
    knowledgeBase.isEnabledRAGAlerts,
    updatedAssistantStreamingEnabled,
    updatedKnowledgeBaseSettings,
    assistantStreamingEnabled,
    setAssistantStreamingEnabled,
    setKnowledgeBase,
    setDefaultAllow,
    updatedDefaultAllow,
    setDefaultAllowReplacement,
    updatedDefaultAllowReplacement,
    assistantTelemetry,
  ]);

  return {
    conversationSettings,
    conversationsSettingsBulkActions,
    defaultAllow: updatedDefaultAllow,
    defaultAllowReplacement: updatedDefaultAllowReplacement,
    knowledgeBase: updatedKnowledgeBaseSettings,
    assistantStreamingEnabled: updatedAssistantStreamingEnabled,
    quickPromptSettings: updatedQuickPromptSettings,
    resetSettings,
    systemPromptSettings: updatedSystemPromptSettings,
    saveSettings,
    setUpdatedDefaultAllow,
    setUpdatedDefaultAllowReplacement,
    setUpdatedKnowledgeBaseSettings,
    setUpdatedAssistantStreamingEnabled,
    setUpdatedQuickPromptSettings,
    setUpdatedSystemPromptSettings,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  };
};
