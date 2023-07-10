/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { Prompt, QuickPrompt } from '../../../..';
import { UseAssistantContext, useAssistantContext } from '../../../assistant_context';

interface UseSettingsUpdater {
  conversationSettings: UseAssistantContext['conversations'];
  quickPromptSettings: QuickPrompt[];
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<UseAssistantContext['conversations']>
  >;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  saveSettings: () => void;
}

// TODO: Ensure base state gets reset on `cancel` action

export const useSettingsUpdater = (): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    conversations,
    allQuickPrompts,
    allSystemPrompts,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
    setIsSettingsModalVisible,
    setDefaultAllow,
    setDefaultAllowReplacement,
  } = useAssistantContext();

  /**
   * Pending updating state
   */
  // Conversations
  const [updatedConversationSettings, setUpdatedConversationSettings] =
    useState<UseAssistantContext['conversations']>(conversations);
  // Quick Prompts
  const [updatedQuickPromptSettings, setUpdatedQuickPromptSettings] =
    useState<QuickPrompt[]>(allQuickPrompts);
  // System Prompts
  const [updatedSystemPromptSettings, setUpdatedSystemPromptSettings] =
    useState<Prompt[]>(allSystemPrompts);
  // Anonymization

  // Callback for modal onSave, saves to local storage on change
  const onSystemPromptsChange = useCallback(
    (newSystemPrompts: Prompt[]) => {
      setAllSystemPrompts(newSystemPrompts);
      setIsSettingsModalVisible(false);
    },
    [setAllSystemPrompts, setIsSettingsModalVisible]
  );

  /**
   * Save all pending settings
   */
  const saveSettings = useCallback((): void => {
    setAllQuickPrompts(updatedQuickPromptSettings);
    setAllSystemPrompts(updatedSystemPromptSettings);
    setConversations(updatedConversationSettings);
  }, [
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
    updatedConversationSettings,
    updatedQuickPromptSettings,
    updatedSystemPromptSettings,
  ]);

  return {
    conversationSettings: updatedConversationSettings,
    setUpdatedConversationSettings,
    quickPromptSettings: updatedQuickPromptSettings,
    setUpdatedQuickPromptSettings,
    saveSettings,
  };
};
