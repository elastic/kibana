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
import { bulkConversationsChange } from '../../api/conversations/use_bulk_actions_conversations';

interface UseSettingsUpdater {
  conversationSettings: Record<string, Conversation>;
  createdConversationSettings: Record<string, Conversation>;
  deletedConversationSettings: string[];
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  knowledgeBase: KnowledgeBaseConfig;
  quickPromptSettings: QuickPrompt[];
  resetSettings: () => void;
  systemPromptSettings: Prompt[];
  setUpdatedDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<Record<string, Conversation>>
  >;
  setCreatedConversationSettings: React.Dispatch<
    React.SetStateAction<Record<string, Conversation>>
  >;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setDeletedConversationSettings: React.Dispatch<React.SetStateAction<string[]>>;
  saveSettings: () => void;
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
    setKnowledgeBase,
    http,
  } = useAssistantContext();

  /**
   * Pending updating state
   */
  // Conversations
  const [updatedConversationSettings, setUpdatedConversationSettings] =
    useState<Record<string, Conversation>>(conversations);
  const [createdConversationSettings, setCreatedConversationSettings] = useState<
    Record<string, Conversation>
  >({});
  const [deletedConversationSettings, setDeletedConversationSettings] = useState<string[]>([]);
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
  // Knowledge Base
  const [updatedKnowledgeBaseSettings, setUpdatedKnowledgeBaseSettings] =
    useState<KnowledgeBaseConfig>(knowledgeBase);

  /**
   * Reset all pending settings
   */
  const resetSettings = useCallback((): void => {
    setUpdatedConversationSettings(conversations);
    setDeletedConversationSettings([]);
    setCreatedConversationSettings({});
    setUpdatedQuickPromptSettings(allQuickPrompts);
    setUpdatedKnowledgeBaseSettings(knowledgeBase);
    setUpdatedSystemPromptSettings(allSystemPrompts);
    setUpdatedDefaultAllow(defaultAllow);
    setUpdatedDefaultAllowReplacement(defaultAllowReplacement);
  }, [
    allQuickPrompts,
    allSystemPrompts,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    knowledgeBase,
  ]);

  /**
   * Save all pending settings
   */
  const saveSettings = useCallback((): void => {
    setAllQuickPrompts(updatedQuickPromptSettings);
    setAllSystemPrompts(updatedSystemPromptSettings);
    bulkConversationsChange(http, {
      update: Object.keys(updatedConversationSettings).reduce(
        (
          conversationsToUpdate: Array<Omit<Conversation, 'createdAt' | 'updatedAt' | 'user'>>,
          conversationId: string
        ) => {
          if (updatedConversationSettings.updatedAt === undefined) {
            conversationsToUpdate.push({
              ...(updatedConversationSettings[conversationId] as Omit<
                Conversation,
                'createdAt' | 'updatedAt' | 'user'
              >),
            });
          }
          return conversationsToUpdate;
        },
        []
      ),
      create: Object.keys(createdConversationSettings).reduce(
        (conversationsToCreate: Conversation[], conversationId: string) => {
          conversationsToCreate.push(createdConversationSettings[conversationId]);
          return conversationsToCreate;
        },
        []
      ),
      delete:
        deletedConversationSettings.length > 0
          ? {
              ids: deletedConversationSettings,
            }
          : undefined,
    });

    const didUpdateKnowledgeBase =
      knowledgeBase.isEnabledKnowledgeBase !== updatedKnowledgeBaseSettings.isEnabledKnowledgeBase;
    const didUpdateRAGAlerts =
      knowledgeBase.isEnabledRAGAlerts !== updatedKnowledgeBaseSettings.isEnabledRAGAlerts;
    if (didUpdateKnowledgeBase || didUpdateRAGAlerts) {
      assistantTelemetry?.reportAssistantSettingToggled({
        ...(didUpdateKnowledgeBase
          ? { isEnabledKnowledgeBase: updatedKnowledgeBaseSettings.isEnabledKnowledgeBase }
          : {}),
        ...(didUpdateRAGAlerts
          ? { isEnabledRAGAlerts: updatedKnowledgeBaseSettings.isEnabledRAGAlerts }
          : {}),
      });
    }
    setKnowledgeBase(updatedKnowledgeBaseSettings);
    setDefaultAllow(updatedDefaultAllow);
    setDefaultAllowReplacement(updatedDefaultAllowReplacement);
  }, [
    setAllQuickPrompts,
    updatedQuickPromptSettings,
    setAllSystemPrompts,
    updatedSystemPromptSettings,
    http,
    updatedConversationSettings,
    createdConversationSettings,
    deletedConversationSettings,
    knowledgeBase.isEnabledKnowledgeBase,
    knowledgeBase.isEnabledRAGAlerts,
    updatedKnowledgeBaseSettings,
    setKnowledgeBase,
    setDefaultAllow,
    updatedDefaultAllow,
    setDefaultAllowReplacement,
    updatedDefaultAllowReplacement,
    assistantTelemetry,
  ]);

  return {
    conversationSettings: updatedConversationSettings,
    createdConversationSettings,
    deletedConversationSettings,
    defaultAllow: updatedDefaultAllow,
    defaultAllowReplacement: updatedDefaultAllowReplacement,
    knowledgeBase: updatedKnowledgeBaseSettings,
    quickPromptSettings: updatedQuickPromptSettings,
    resetSettings,
    systemPromptSettings: updatedSystemPromptSettings,
    saveSettings,
    setUpdatedDefaultAllow,
    setUpdatedDefaultAllowReplacement,
    setUpdatedConversationSettings,
    setCreatedConversationSettings,
    setUpdatedKnowledgeBaseSettings,
    setUpdatedQuickPromptSettings,
    setUpdatedSystemPromptSettings,
    setDeletedConversationSettings,
  };
};
