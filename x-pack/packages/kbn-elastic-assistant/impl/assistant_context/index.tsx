/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { omit, uniq } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { useLocalStorage } from 'react-use';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
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
import { Prompt } from '../assistant/types';
import { BASE_SYSTEM_PROMPTS } from '../content/prompts/system';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY,
  QUICK_PROMPT_LOCAL_STORAGE_KEY,
  SYSTEM_PROMPT_LOCAL_STORAGE_KEY,
} from './constants';
import { CONVERSATIONS_TAB, SettingsTabs } from '../assistant/settings/assistant_settings';
import { AssistantTelemetry } from './types';

export interface ShowAssistantOverlayProps {
  showOverlay: boolean;
  promptContextId?: string;
  conversationId?: string;
}

type ShowAssistantOverlay = ({
  showOverlay,
  promptContextId,
  conversationId,
}: ShowAssistantOverlayProps) => void;
export interface AssistantProviderProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  baseAllow: string[];
  baseAllowReplacement: string[];
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  basePromptContexts?: PromptContextTemplate[];
  baseQuickPrompts?: QuickPrompt[];
  baseSystemPrompts?: Prompt[];
  docLinks: Omit<DocLinksStart, 'links'>;
  children: React.ReactNode;
  getComments: ({
    currentConversation,
    lastCommentRef,
    showAnonymizedValues,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
    showAnonymizedValues: boolean;
  }) => EuiCommentProps[];
  http: HttpSetup;
  getInitialConversations: () => Record<string, Conversation>;
  nameSpace?: string;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  title?: string;
}

export interface UseAssistantContext {
  actionTypeRegistry: ActionTypeRegistryContract;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  allQuickPrompts: QuickPrompt[];
  allSystemPrompts: Prompt[];
  baseAllow: string[];
  baseAllowReplacement: string[];
  docLinks: Omit<DocLinksStart, 'links'>;
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  basePromptContexts: PromptContextTemplate[];
  baseQuickPrompts: QuickPrompt[];
  baseSystemPrompts: Prompt[];
  conversationIds: string[];
  conversations: Record<string, Conversation>;
  getComments: ({
    currentConversation,
    lastCommentRef,
    showAnonymizedValues,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;

    showAnonymizedValues: boolean;
  }) => EuiCommentProps[];
  http: HttpSetup;
  localStorageLastConversationId: string | undefined;
  promptContexts: Record<string, PromptContext>;
  nameSpace: string;
  registerPromptContext: RegisterPromptContext;
  selectedSettingsTab: SettingsTabs;
  setAllQuickPrompts: React.Dispatch<React.SetStateAction<QuickPrompt[] | undefined>>;
  setAllSystemPrompts: React.Dispatch<React.SetStateAction<Prompt[] | undefined>>;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  setLastConversationId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedSettingsTab: React.Dispatch<React.SetStateAction<SettingsTabs>>;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
  showAssistantOverlay: ShowAssistantOverlay;
  title: string;
  unRegisterPromptContext: UnRegisterPromptContext;
}

const AssistantContext = React.createContext<UseAssistantContext | undefined>(undefined);

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  actionTypeRegistry,
  assistantTelemetry,
  augmentMessageCodeBlocks,
  baseAllow,
  baseAllowReplacement,
  defaultAllow,
  defaultAllowReplacement,
  docLinks,
  basePromptContexts = [],
  baseQuickPrompts = [],
  baseSystemPrompts = BASE_SYSTEM_PROMPTS,
  children,
  getComments,
  http,
  getInitialConversations,
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  setConversations,
  setDefaultAllow,
  setDefaultAllowReplacement,
  title = DEFAULT_ASSISTANT_TITLE,
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

  const [localStorageLastConversationId, setLocalStorageLastConversationId] =
    useLocalStorage<string>(`${nameSpace}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}`);

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

  const [conversations, setConversationsInternal] = useState(getInitialConversations());
  const conversationIds = useMemo(() => Object.keys(conversations).sort(), [conversations]);

  // TODO: This is a fix for conversations not loading out of localstorage. Also re-introduces our cascading render issue (as it loops back in localstorage)
  useEffect(() => {
    setConversationsInternal(getInitialConversations());
  }, [getInitialConversations]);

  const onConversationsUpdated = useCallback<
    React.Dispatch<React.SetStateAction<Record<string, Conversation>>>
  >(
    (
      newConversations:
        | Record<string, Conversation>
        | ((prev: Record<string, Conversation>) => Record<string, Conversation>)
    ) => {
      if (typeof newConversations === 'function') {
        const updater = newConversations;
        setConversationsInternal((prevValue) => {
          const newValue = updater(prevValue);
          setConversations(newValue);
          return newValue;
        });
      } else {
        setConversations(newConversations);
        setConversationsInternal(newConversations);
      }
    },
    [setConversations]
  );

  const value = useMemo(
    () => ({
      actionTypeRegistry,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      allQuickPrompts: localStorageQuickPrompts ?? [],
      allSystemPrompts: localStorageSystemPrompts ?? [],
      baseAllow: uniq(baseAllow),
      baseAllowReplacement: uniq(baseAllowReplacement),
      basePromptContexts,
      baseQuickPrompts,
      baseSystemPrompts,
      conversationIds,
      conversations,
      defaultAllow: uniq(defaultAllow),
      defaultAllowReplacement: uniq(defaultAllowReplacement),
      docLinks,
      getComments,
      http,
      promptContexts,
      nameSpace,
      registerPromptContext,
      selectedSettingsTab,
      setAllQuickPrompts: setLocalStorageQuickPrompts,
      setAllSystemPrompts: setLocalStorageSystemPrompts,
      setConversations: onConversationsUpdated,
      setDefaultAllow,
      setDefaultAllowReplacement,
      setSelectedSettingsTab,
      setShowAssistantOverlay,
      showAssistantOverlay,
      title,
      unRegisterPromptContext,
      localStorageLastConversationId,
      setLastConversationId: setLocalStorageLastConversationId,
    }),
    [
      actionTypeRegistry,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      baseAllow,
      baseAllowReplacement,
      basePromptContexts,
      baseQuickPrompts,
      baseSystemPrompts,
      conversationIds,
      conversations,
      defaultAllow,
      defaultAllowReplacement,
      docLinks,
      getComments,
      http,
      localStorageLastConversationId,
      localStorageQuickPrompts,
      localStorageSystemPrompts,
      nameSpace,
      onConversationsUpdated,
      promptContexts,
      registerPromptContext,
      selectedSettingsTab,
      setDefaultAllow,
      setDefaultAllowReplacement,
      setLocalStorageLastConversationId,
      setLocalStorageQuickPrompts,
      setLocalStorageSystemPrompts,
      setSelectedSettingsTab,
      showAssistantOverlay,
      title,
      unRegisterPromptContext,
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
