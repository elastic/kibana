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
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  quickPromptSettings: QuickPrompt[];
  resetSettings: () => void;
  systemPromptSettings: Prompt[];
  setUpdatedDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<UseAssistantContext['conversations']>
  >;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  saveSettings: () => void;
}

export const useSettingsUpdater = (): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    allQuickPrompts,
    allSystemPrompts,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
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
  const [updatedDefaultAllow, setUpdatedDefaultAllow] = useState<string[]>(defaultAllow);
  const [updatedDefaultAllowReplacement, setUpdatedDefaultAllowReplacement] =
    useState<string[]>(defaultAllowReplacement);

  /**
   * Reset all pending settings
   */
  const resetSettings = useCallback((): void => {
    setUpdatedConversationSettings(conversations);
    setUpdatedQuickPromptSettings(allQuickPrompts);
    setUpdatedSystemPromptSettings(allSystemPrompts);
    setUpdatedDefaultAllow(defaultAllow);
    setUpdatedDefaultAllowReplacement(defaultAllowReplacement);
  }, [allQuickPrompts, allSystemPrompts, conversations, defaultAllow, defaultAllowReplacement]);

  /**
   * Save all pending settings
   */
  const saveSettings = useCallback((): void => {
    setAllQuickPrompts(updatedQuickPromptSettings);
    setAllSystemPrompts(updatedSystemPromptSettings);
    setConversations(updatedConversationSettings);
    setDefaultAllow(updatedDefaultAllow);
    setDefaultAllowReplacement(updatedDefaultAllowReplacement);
  }, [
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
    setDefaultAllow,
    setDefaultAllowReplacement,
    updatedConversationSettings,
    updatedDefaultAllow,
    updatedDefaultAllowReplacement,
    updatedQuickPromptSettings,
    updatedSystemPromptSettings,
  ]);

  return {
    conversationSettings: updatedConversationSettings,
    defaultAllow: updatedDefaultAllow,
    defaultAllowReplacement: updatedDefaultAllowReplacement,
    quickPromptSettings: updatedQuickPromptSettings,
    resetSettings,
    systemPromptSettings: updatedSystemPromptSettings,
    saveSettings,
    setUpdatedDefaultAllow,
    setUpdatedDefaultAllowReplacement,
    setUpdatedConversationSettings,
    setUpdatedQuickPromptSettings,
    setUpdatedSystemPromptSettings,
  };
};
