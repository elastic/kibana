/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { merge } from 'lodash';
import { Conversation, Prompt, QuickPrompt, useFetchConversationsByUser } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import type { KnowledgeBaseConfig } from '../../types';
import { bulkConversationsChange } from '../../api/use_bulk_actions_conversations';

interface UseSettingsUpdater {
  conversationSettings: Record<string, Conversation>;
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
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setDeletedConversationSettings: React.Dispatch<React.SetStateAction<string[]>>;
  saveSettings: () => void;
}

export const useSettingsUpdater = (): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    allQuickPrompts,
    allSystemPrompts,
    defaultAllow,
    defaultAllowReplacement,
    baseConversations,
    knowledgeBase,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setDefaultAllow,
    setDefaultAllowReplacement,
    setKnowledgeBase,
    http,
  } = useAssistantContext();

  const { data: conversationsData, isLoading } = useFetchConversationsByUser();

  const conversations = merge(
    baseConversations,
    (conversationsData?.data ?? []).reduce<Record<string, Conversation>>(
      (transformed, conversation) => {
        transformed[conversation.id] = conversation;
        return transformed;
      },
      {}
    )
  );

  /**
   * Pending updating state
   */
  // Conversations
  const [updatedConversationSettings, setUpdatedConversationSettings] =
    useState<Record<string, Conversation>>(conversations);
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
      conversationsToUpdate: Object.keys(updatedConversationSettings).reduce(
        (conversationsToUpdate: Conversation[], conversationId: string) => {
          if (!updatedConversationSettings[conversationId].isDefault) {
            conversationsToUpdate.push(updatedConversationSettings[conversationId]);
          }
          return conversationsToUpdate;
        },
        []
      ),
      conversationsToCreate: Object.keys(updatedConversationSettings).reduce(
        (conversationsToCreate: Conversation[], conversationId: string) => {
          if (updatedConversationSettings[conversationId].isDefault) {
            conversationsToCreate.push(updatedConversationSettings[conversationId]);
          }
          return conversationsToCreate;
        },
        []
      ),
      conversationsToDelete: deletedConversationSettings,
    });

    setKnowledgeBase(updatedKnowledgeBaseSettings);
    setDefaultAllow(updatedDefaultAllow);
    setDefaultAllowReplacement(updatedDefaultAllowReplacement);
  }, [
    deletedConversationSettings,
    http,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setDefaultAllow,
    setDefaultAllowReplacement,
    setKnowledgeBase,
    updatedConversationSettings,
    updatedDefaultAllow,
    updatedDefaultAllowReplacement,
    updatedKnowledgeBaseSettings,
    updatedQuickPromptSettings,
    updatedSystemPromptSettings,
  ]);

  return {
    conversationSettings: updatedConversationSettings,
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
    setUpdatedKnowledgeBaseSettings,
    setUpdatedQuickPromptSettings,
    setUpdatedSystemPromptSettings,
    setDeletedConversationSettings,
  };
};
