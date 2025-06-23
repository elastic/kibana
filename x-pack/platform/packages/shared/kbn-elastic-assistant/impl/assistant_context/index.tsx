/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { omit } from 'lodash/fp';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import type { IToasts } from '@kbn/core-notifications-browser';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { AssistantFeatures, defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import {
  ChromeStart,
  UnmountCallback,
  ApplicationStart,
  UserProfileService,
} from '@kbn/core/public';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { updatePromptContexts } from './helpers';
import type {
  PromptContext,
  RegisterPromptContext,
  UnRegisterPromptContext,
} from '../assistant/prompt_context/types';
import {
  AssistantAvailability,
  AssistantTelemetry,
  Conversation,
  GetAssistantMessages,
} from './types';
import { DEFAULT_ASSISTANT_TITLE } from '../assistant/translations';
import { PromptContextTemplate } from '../assistant/prompt_context/types';
import { KnowledgeBaseConfig, TraceOptions } from '../assistant/types';
import {
  CONTENT_REFERENCES_VISIBLE_LOCAL_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_KNOWLEDGE_BASE_SETTINGS,
  KNOWLEDGE_BASE_LOCAL_STORAGE_KEY,
  SHOW_ANONYMIZED_VALUES_LOCAL_STORAGE_KEY,
  STREAMING_LOCAL_STORAGE_KEY,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from './constants';
import { useCapabilities } from '../assistant/api/capabilities/use_capabilities';
import { ModalSettingsTabs } from '../assistant/settings/types';

export type SelectedConversation = { id: string } | { title: string };

export interface ShowAssistantOverlayProps {
  showOverlay: boolean;
  promptContextId?: string;
  // id if the conversation exists in the data stream, title if it's a new conversation
  selectedConversation?: SelectedConversation;
}

type ShowAssistantOverlay = ({
  showOverlay,
  promptContextId,
  selectedConversation,
}: ShowAssistantOverlayProps) => void;

type GetUrlForApp = ApplicationStart['getUrlForApp'];

export interface AssistantProviderProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  alertsIndexPattern?: string;
  assistantAvailability: AssistantAvailability;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: {
    mount: (args: {
      currentConversation: Conversation;
      showAnonymizedValues: boolean;
    }) => UnmountCallback;
  };
  basePath: string;
  basePromptContexts?: PromptContextTemplate[];
  docLinks: DocLinksStart;
  getUrlForApp: GetUrlForApp;
  getComments: GetAssistantMessages;
  http: HttpSetup;
  inferenceEnabled?: boolean;
  nameSpace?: string;
  navigateToApp: ApplicationStart['navigateToApp'];
  title?: string;
  toasts?: IToasts;
  currentAppId: string;
  productDocBase: ProductDocBasePluginStart;
  userProfileService: UserProfileService;
  chrome: ChromeStart;
}

export interface UserAvatar {
  color: string;
  imageUrl?: string;
  initials: string;
}

export interface UseAssistantContext {
  actionTypeRegistry: ActionTypeRegistryContract;
  alertsIndexPattern: string | undefined;
  assistantAvailability: AssistantAvailability;
  assistantFeatures: Partial<AssistantFeatures>;
  assistantStreamingEnabled: boolean;
  assistantTelemetry?: AssistantTelemetry;
  augmentMessageCodeBlocks: {
    mount: (args: {
      currentConversation: Conversation;
      showAnonymizedValues: boolean;
    }) => UnmountCallback;
  };
  docLinks: DocLinksStart;
  basePath: string;
  currentUserAvatar?: UserAvatar;
  getComments: GetAssistantMessages;
  getUrlForApp: GetUrlForApp;
  http: HttpSetup;
  inferenceEnabled: boolean;
  knowledgeBase: KnowledgeBaseConfig;
  promptContexts: Record<string, PromptContext>;
  navigateToApp: ApplicationStart['navigateToApp'];
  nameSpace: string;
  registerPromptContext: RegisterPromptContext;
  selectedSettingsTab: ModalSettingsTabs | null;
  contentReferencesVisible: boolean;
  showAnonymizedValues: boolean;
  setShowAnonymizedValues: React.Dispatch<React.SetStateAction<boolean>>;
  setContentReferencesVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig | undefined>>;
  setSelectedSettingsTab: React.Dispatch<React.SetStateAction<ModalSettingsTabs | null>>;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
  showAssistantOverlay: ShowAssistantOverlay;
  setTraceOptions: (traceOptions: {
    apmUrl: string;
    langSmithProject: string;
    langSmithApiKey: string;
  }) => void;
  title: string;
  toasts: IToasts | undefined;
  traceOptions: TraceOptions;
  basePromptContexts: PromptContextTemplate[];
  unRegisterPromptContext: UnRegisterPromptContext;
  currentAppId: string;
  codeBlockRef: React.MutableRefObject<(codeBlock: string) => void>;
  productDocBase: ProductDocBasePluginStart;
  userProfileService: UserProfileService;
  chrome: ChromeStart;
}

const AssistantContext = React.createContext<UseAssistantContext | undefined>(undefined);

export const useAssistantContext = () => {
  const context = React.useContext(AssistantContext);

  if (context == null) {
    throw new Error('useAssistantContext must be used within a AssistantProvider');
  }

  return context;
};

export const useAssistantContextValue = (props: AssistantProviderProps): UseAssistantContext => {
  const {
    actionTypeRegistry,
    alertsIndexPattern,
    assistantAvailability,
    assistantTelemetry,
    augmentMessageCodeBlocks,
    docLinks,
    basePath,
    basePromptContexts = [],
    getComments,
    getUrlForApp,
    http,
    inferenceEnabled = false,
    navigateToApp,
    nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
    productDocBase,
    title = DEFAULT_ASSISTANT_TITLE,
    toasts,
    currentAppId,
    userProfileService,
    chrome,
  } = props;

  const defaultTraceOptions: TraceOptions = {
    apmUrl: `${http.basePath.serverBasePath}/app/apm`,
    langSmithProject: '',
    langSmithApiKey: '',
  };

  const [sessionStorageTraceOptions = defaultTraceOptions, setSessionStorageTraceOptions] =
    useSessionStorage<TraceOptions>(
      `${nameSpace}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}`,
      defaultTraceOptions
    );

  /**
   * Local storage for knowledge base configuration, prefixed by assistant nameSpace
   */
  const [localStorageKnowledgeBase, setLocalStorageKnowledgeBase] = useLocalStorage(
    `${nameSpace}.${KNOWLEDGE_BASE_LOCAL_STORAGE_KEY}`,
    DEFAULT_KNOWLEDGE_BASE_SETTINGS
  );

  /**
   * Local storage for streaming configuration, prefixed by assistant nameSpace
   */
  // can be undefined from localStorage, if not defined, default to true
  const [localStorageStreaming, setLocalStorageStreaming] = useLocalStorage<boolean>(
    `${nameSpace}.${STREAMING_LOCAL_STORAGE_KEY}`,
    true
  );

  /**
   * Local storage for content references configuration, prefixed by assistant nameSpace
   */
  // can be undefined from localStorage, if not defined, default to true
  const [contentReferencesVisible, setContentReferencesVisible] = useLocalStorage<boolean>(
    `${nameSpace}.${CONTENT_REFERENCES_VISIBLE_LOCAL_STORAGE_KEY}`,
    true
  );

  /**
   * Local storage for anonymized values, prefixed by assistant nameSpace
   */
  // can be undefined from localStorage, if not defined, default to false
  const [showAnonymizedValues, setShowAnonymizedValues] = useLocalStorage<boolean>(
    `${nameSpace}.${SHOW_ANONYMIZED_VALUES_LOCAL_STORAGE_KEY}`,
    false
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
  const [showAssistantOverlay, setShowAssistantOverlay] = useState<ShowAssistantOverlay>(() => {});

  /**
   * Current User Avatar
   */
  const { data: currentUserAvatar } = useQuery({
    queryKey: ['currentUserAvatar'],
    queryFn: async () =>
      userProfileService.getCurrent<{ avatar: UserAvatar }>({
        dataPath: 'avatar',
      }),
    select: (data) => {
      return data.data.avatar;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  /**
   * Settings State
   */
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<ModalSettingsTabs | null>(null);

  /**
   * Setting code block ref that can be used to store callback from parent components
   */
  const codeBlockRef = useRef(() => {});

  // Fetch assistant capabilities
  const { data: assistantFeatures } = useCapabilities({ http, toasts });

  const value: UseAssistantContext = useMemo(
    () => ({
      actionTypeRegistry,
      alertsIndexPattern,
      assistantAvailability,
      assistantFeatures: assistantFeatures ?? defaultAssistantFeatures,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      basePath,
      basePromptContexts,
      currentUserAvatar,
      docLinks,
      getComments,
      getUrlForApp,
      http,
      inferenceEnabled,
      knowledgeBase: {
        ...DEFAULT_KNOWLEDGE_BASE_SETTINGS,
        ...localStorageKnowledgeBase,
      },
      promptContexts,
      navigateToApp,
      nameSpace,
      productDocBase,
      registerPromptContext,
      selectedSettingsTab,
      // can be undefined from localStorage, if not defined, default to true
      assistantStreamingEnabled: localStorageStreaming ?? true,
      setAssistantStreamingEnabled: setLocalStorageStreaming,
      setKnowledgeBase: setLocalStorageKnowledgeBase,
      contentReferencesVisible: contentReferencesVisible ?? true,
      setContentReferencesVisible: setContentReferencesVisible as React.Dispatch<
        React.SetStateAction<boolean>
      >,
      showAnonymizedValues: showAnonymizedValues ?? false,
      setShowAnonymizedValues: setShowAnonymizedValues as React.Dispatch<
        React.SetStateAction<boolean>
      >,
      setSelectedSettingsTab,
      setShowAssistantOverlay,
      setTraceOptions: setSessionStorageTraceOptions,
      showAssistantOverlay,
      title,
      toasts,
      traceOptions: sessionStorageTraceOptions,
      unRegisterPromptContext,
      currentAppId,
      codeBlockRef,
      userProfileService,
      chrome,
    }),
    [
      actionTypeRegistry,
      alertsIndexPattern,
      assistantAvailability,
      assistantFeatures,
      assistantTelemetry,
      augmentMessageCodeBlocks,
      basePath,
      basePromptContexts,
      currentUserAvatar,
      docLinks,
      getComments,
      getUrlForApp,
      http,
      inferenceEnabled,
      localStorageKnowledgeBase,
      promptContexts,
      navigateToApp,
      nameSpace,
      productDocBase,
      registerPromptContext,
      selectedSettingsTab,
      localStorageStreaming,
      setLocalStorageStreaming,
      setLocalStorageKnowledgeBase,
      showAnonymizedValues,
      setShowAnonymizedValues,
      contentReferencesVisible,
      setContentReferencesVisible,
      setSessionStorageTraceOptions,
      showAssistantOverlay,
      title,
      toasts,
      sessionStorageTraceOptions,
      unRegisterPromptContext,
      currentAppId,
      codeBlockRef,
      userProfileService,
      chrome,
    ]
  );

  return value;
};

export const AssistantProvider: React.FC<{
  children: React.ReactNode;
  value: ReturnType<typeof useAssistantContextValue>;
}> = ({ children, value }) => {
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};
