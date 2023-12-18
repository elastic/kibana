/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { Prompt, QuickPrompt } from '../../../..';
import { UseAssistantContext, useAssistantContext } from '../../../assistant_context';
import type { KnowledgeBaseConfig } from '../../types';

interface UseSettingsUpdater {
  conversationSettings: UseAssistantContext['conversations'];
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  knowledgeBase: KnowledgeBaseConfig;
  quickPromptSettings: QuickPrompt[];
  resetSettings: () => void;
  systemPromptSettings: Prompt[];
  setUpdatedDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<UseAssistantContext['conversations']>
  >;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  saveSettings: () => void;
}

export const useSettingsUpdater = (): UseSettingsUpdater => {
  // Initial state from assistant context
  const {
    allQuickPrompts,
    allSystemPrompts,
    assistantTelemetry,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    knowledgeBase,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
    setDefaultAllow,
    setDefaultAllowReplacement,
    setKnowledgeBase,
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
  // Knowledge Base
  const [updatedKnowledgeBaseSettings, setUpdatedKnowledgeBaseSettings] =
    useState<KnowledgeBaseConfig>(knowledgeBase);
  //
  // const [didUpdateKnowledgeBaseSettings, setDidUpdateKnowledgeBaseSettings] =
  //   useState<boolean>(false);
  //
  // const setUpdatedKnowledgeBaseSettings = useCallback((knowledgeBase) => {
  //   _setUpdatedKnowledgeBaseSettings(knowledgeBase);
  //   setDidUpdateKnowledgeBaseSettings((last) => !last);
  // }, []);

  /**
   * Reset all pending settings
   */
  const resetSettings = useCallback((): void => {
    setUpdatedConversationSettings(conversations);
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
    setConversations(updatedConversationSettings);
    const didUpdateKnowledgeBase =
      knowledgeBase.assistantLangChain !== updatedKnowledgeBaseSettings.assistantLangChain;
    const didUpdateRAGAlerts = knowledgeBase.alerts !== updatedKnowledgeBaseSettings.alerts;
    if (didUpdateKnowledgeBase || didUpdateRAGAlerts) {
      assistantTelemetry?.reportAssistantSettingToggled({
        ...(didUpdateKnowledgeBase
          ? { didEnableKnowledgeBase: updatedKnowledgeBaseSettings.assistantLangChain }
          : {}),
        ...(didUpdateRAGAlerts ? { didEnableRAGAlerts: updatedKnowledgeBaseSettings.alerts } : {}),
      });
    }
    setKnowledgeBase(updatedKnowledgeBaseSettings);
    setDefaultAllow(updatedDefaultAllow);
    setDefaultAllowReplacement(updatedDefaultAllowReplacement);
  }, [
    assistantTelemetry,
    knowledgeBase.alerts,
    knowledgeBase.assistantLangChain,
    setAllQuickPrompts,
    setAllSystemPrompts,
    setConversations,
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
  };
};
