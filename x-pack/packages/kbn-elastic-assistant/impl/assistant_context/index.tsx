/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { omit, uniq } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import type { IToasts } from '@kbn/core-notifications-browser';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { useLocalStorage } from 'react-use';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { updatePromptContexts } from './helpers';
import type {
  PromptContext,
  RegisterPromptContext,
  UnRegisterPromptContext,
} from '../assistant/prompt_context/types';
import type { Conversation } from './types';
import { DEFAULT_ASSISTANT_TITLE } from '../assistant/translations';
import { CodeBlockDetails } from '../assistant/use_conversation/helpers';
import { PromptContextTemplate } from '../assistant/prompt_context/types';
import { QuickPrompt } from '../assistant/quick_prompts/types';
import type { KnowledgeBaseConfig, Prompt } from '../assistant/types';
import { BASE_SYSTEM_PROMPTS } from '../content/prompts/system';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_KNOWLEDGE_BASE_SETTINGS,
  KNOWLEDGE_BASE_LOCAL_STORAGE_KEY,
  LAST_CONVERSATION_TITLE_LOCAL_STORAGE_KEY,
  QUICK_PROMPT_LOCAL_STORAGE_KEY,
  SYSTEM_PROMPT_LOCAL_STORAGE_KEY,
} from './constants';
import { CONVERSATIONS_TAB, SettingsTabs } from '../assistant/settings/assistant_settings';
import { AssistantAvailability, AssistantTelemetry } from './types';
import { useCapabilities } from '../assistant/api/capabilities/use_capabilities';
import { WELCOME_CONVERSATION_TITLE } from '../assistant/use_conversation/translations';

export interface ShowAssistantOverlayProps {
  showOverlay: boolean;
  promptContextId?: string;
  conversationTitle?: string;
}

type ShowAssistantOverlay = ({
  showOverlay,
  promptContextId,
  conversationTitle,
}: ShowAssistantOverlayProps) => void;
export interface AssistantProviderProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  alertsIndexPattern?: string;
  assistantAvailability: AssistantAvailability;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: (
    currentConversation: Conversation,
    showAnonymizedValues: boolean
  ) => CodeBlockDetails[][];
  baseAllow: string[];
  baseAllowReplacement: string[];
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  basePath: string;
  basePromptContexts?: PromptContextTemplate[];
  baseQuickPrompts?: QuickPrompt[];
  baseSystemPrompts?: Prompt[];
  docLinks: Omit<DocLinksStart, 'links'>;
  children: React.ReactNode;
  getComments: (commentArgs: {
    abortStream: () => void;
    currentConversation: Conversation;
    isEnabledLangChain: boolean;
    isFetchingResponse: boolean;
    refetchCurrentConversation: () => void;
    regenerateMessage: (conversationId: string) => void;
    showAnonymizedValues: boolean;
    setIsStreaming: (isStreaming: boolean) => void;
  }) => EuiCommentProps[];
  http: HttpSetup;
  baseConversations: Record<string, Conversation>;
  nameSpace?: string;
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  title?: string;
  toasts?: IToasts;
}

export interface UseAssistantContext {
  actionTypeRegistry: ActionTypeRegistryContract;
  alertsIndexPattern: string | undefined;
  assistantAvailability: AssistantAvailability;
  assistantStreamingEnabled: boolean;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: (
    currentConversation: Conversation,
    showAnonymizedValues: boolean
  ) => CodeBlockDetails[][];
  allQuickPrompts: QuickPrompt[];
  allSystemPrompts: Prompt[];
  baseAllow: string[];
  baseAllowReplacement: string[];
  docLinks: Omit<DocLinksStart, 'links'>;
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  basePath: string;
  basePromptContexts: PromptContextTemplate[];
  baseQuickPrompts: QuickPrompt[];
  baseSystemPrompts: Prompt[];
  baseConversations: Record<string, Conversation>;
  getComments: (commentArgs: {
    abortStream: () => void;
    currentConversation: Conversation;
    isEnabledLangChain: boolean;
    isFetchingResponse: boolean;
    refetchCurrentConversation: () => void;
    regenerateMessage: () => void;
    showAnonymizedValues: boolean;
    setIsStreaming: (isStreaming: boolean) => void;
  }) => EuiCommentProps[];
  http: HttpSetup;
  knowledgeBase: KnowledgeBaseConfig;
  getLastConversationTitle: (conversationTitle?: string) => string;
  promptContexts: Record<string, PromptContext>;
  modelEvaluatorEnabled: boolean;
  nameSpace: string;
  registerPromptContext: RegisterPromptContext;
  selectedSettingsTab: SettingsTabs;
  setAllQuickPrompts: React.Dispatch<React.SetStateAction<QuickPrompt[] | undefined>>;
  setAllSystemPrompts: React.Dispatch<React.SetStateAction<Prompt[] | undefined>>;
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig | undefined>>;
  setLastConversationTitle: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedSettingsTab: React.Dispatch<React.SetStateAction<SettingsTabs>>;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
  showAssistantOverlay: ShowAssistantOverlay;
  title: string;
  toasts: IToasts | undefined;
  unRegisterPromptContext: UnRegisterPromptContext;
}

const AssistantContext = React.createContext<UseAssistantContext | undefined>(undefined);

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  actionTypeRegistry,
  alertsIndexPattern,
  assistantAvailability,
  assistantTelemetry,
  augmentMessageCodeBlocks,
  baseAllow,
  baseAllowReplacement,
  defaultAllow,
  defaultAllowReplacement,
  docLinks,
  basePath,
  basePromptContexts = [],
  baseQuickPrompts = [],
  baseSystemPrompts = BASE_SYSTEM_PROMPTS,
  children,
  getComments,
  http,
  baseConversations,
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  setDefaultAllow,
  setDefaultAllowReplacement,
  title = DEFAULT_ASSISTANT_TITLE,
  toasts,
}) => {
  /**
   * Local storage for all quick prompts, prefixed by assistant nameSpace
   */
  const [localStorageQuickPrompts, setLocalStorageQuickPrompts] = useLocalStorage(
    `${nameSpace}.${QUICK_PROMPT_LOCAL_STORAGE_KEY}`,
    baseQuickPrompts
  );

  /**
   * Local storage for all system prompts, prefixed by assistant nameSpace
   */
  const [localStorageSystemPrompts, setLocalStorageSystemPrompts] = useLocalStorage(
    `${nameSpace}.${SYSTEM_PROMPT_LOCAL_STORAGE_KEY}`,
    baseSystemPrompts
  );

  const [localStorageLastConversationTitle, setLocalStorageLastConversationTitle] =
    useLocalStorage<string>(`${nameSpace}.${LAST_CONVERSATION_TITLE_LOCAL_STORAGE_KEY}`);

  /**
   * Local storage for knowledge base configuration, prefixed by assistant nameSpace
   */
  const [localStorageKnowledgeBase, setLocalStorageKnowledgeBase] = useLocalStorage(
    `${nameSpace}.${KNOWLEDGE_BASE_LOCAL_STORAGE_KEY}`,
    DEFAULT_KNOWLEDGE_BASE_SETTINGS
  );

  /**
   * Prompt contexts are used to provide components a way to register and make their data available to the assistant.
   */
  const [promptContexts, setPromptContexts] = useState<Record<string, PromptContext>>({});

  const registerPromptContext: RegisterPromptContext = useCallback(
    (promptContext: PromptContext) => {
      setPromptContexts((prevPromptContexts) => {
        if (promptContext != null && prevPromptContexts[promptContext.id] == null) {
          return updatePromptContexts({
            prevPromptContexts,
            promptContext,
          });
        } else {
          return prevPromptContexts;
        }
      });
    },
    []
  );

  const unRegisterPromptContext: UnRegisterPromptContext = useCallback(
    (queryContextId: string) =>
      setPromptContexts((prevPromptContexts) => {
        if (prevPromptContexts[queryContextId] == null) {
          return prevPromptContexts;
        } else {
          return omit(queryContextId, prevPromptContexts);
        }
      }),
    []
  );

  /**
   * Global Assistant Overlay actions
   */
  const [showAssistantOverlay, setShowAssistantOverlay] = useState<ShowAssistantOverlay>(
    (showAssistant) => {}
  );

  /**
   * Settings State
   */
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<SettingsTabs>(CONVERSATIONS_TAB);

  const getLastConversationTitle = useCallback(
    // if a conversationId has been provided, use that
    // if not, check local storage
    // last resort, go to welcome conversation
    (conversationTitle?: string) =>
      conversationTitle ?? localStorageLastConversationTitle ?? WELCOME_CONVERSATION_TITLE,
    [localStorageLastConversationTitle]
  );

  // Fetch assistant capabilities
  const { data: capabilities } = useCapabilities({ http, toasts });
  const { assistantModelEvaluation: modelEvaluatorEnabled, assistantStreamingEnabled } =
    capabilities ?? defaultAssistantFeatures;

  const value = useMemo(
    () => ({
      actionTypeRegistry,
      alertsIndexPattern,
      assistantAvailability,
      assistantStreamingEnabled,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      allQuickPrompts: localStorageQuickPrompts ?? [],
      allSystemPrompts: localStorageSystemPrompts ?? [],
      baseAllow: uniq(baseAllow),
      baseAllowReplacement: uniq(baseAllowReplacement),
      basePath,
      basePromptContexts,
      baseQuickPrompts,
      baseSystemPrompts,
      defaultAllow: uniq(defaultAllow),
      defaultAllowReplacement: uniq(defaultAllowReplacement),
      docLinks,
      getComments,
      http,
      knowledgeBase: { ...DEFAULT_KNOWLEDGE_BASE_SETTINGS, ...localStorageKnowledgeBase },
      modelEvaluatorEnabled,
      promptContexts,
      nameSpace,
      registerPromptContext,
      selectedSettingsTab,
      setAllQuickPrompts: setLocalStorageQuickPrompts,
      setAllSystemPrompts: setLocalStorageSystemPrompts,
      setDefaultAllow,
      setDefaultAllowReplacement,
      setKnowledgeBase: setLocalStorageKnowledgeBase,
      setSelectedSettingsTab,
      setShowAssistantOverlay,
      showAssistantOverlay,
      title,
      toasts,
      unRegisterPromptContext,
      getLastConversationTitle,
      setLastConversationTitle: setLocalStorageLastConversationTitle,
      baseConversations,
    }),
    [
      actionTypeRegistry,
      alertsIndexPattern,
      assistantAvailability,
      assistantStreamingEnabled,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      localStorageQuickPrompts,
      localStorageSystemPrompts,
      baseAllow,
      baseAllowReplacement,
      basePath,
      basePromptContexts,
      baseQuickPrompts,
      baseSystemPrompts,
      defaultAllow,
      defaultAllowReplacement,
      docLinks,
      getComments,
      http,
      localStorageKnowledgeBase,
      modelEvaluatorEnabled,
      promptContexts,
      nameSpace,
      registerPromptContext,
      selectedSettingsTab,
      setLocalStorageQuickPrompts,
      setLocalStorageSystemPrompts,
      setDefaultAllow,
      setDefaultAllowReplacement,
      setLocalStorageKnowledgeBase,
      showAssistantOverlay,
      title,
      toasts,
      unRegisterPromptContext,
      getLastConversationTitle,
      setLocalStorageLastConversationTitle,
      baseConversations,
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};

export const useAssistantContext = () => {
  const context = React.useContext(AssistantContext);

  if (context == null) {
    throw new Error('useAssistantContext must be used within a AssistantProvider');
  }

  return context;
};
