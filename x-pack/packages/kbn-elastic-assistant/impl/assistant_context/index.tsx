/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';
import type { HttpHandler } from '@kbn/core-http-browser';
import { omit } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import { updatePromptContexts } from './helpers';
import type {
  PromptContext,
  RegisterPromptContext,
  UnRegisterPromptContext,
} from '../assistant/prompt_context/types';
import type { Conversation } from './types';
import { AssistantUiSettings } from '../assistant/helpers';
import { DEFAULT_ASSISTANT_TITLE } from '../assistant/translations';
import { CodeBlockDetails } from '../assistant/use_conversation/helpers';

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
interface AssistantProviderProps {
  apiConfig: AssistantUiSettings;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  children: React.ReactNode;
  conversations: Record<string, Conversation>;
  getComments: ({
    currentConversation,
    lastCommentRef,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  }) => EuiCommentProps[];
  httpFetch: HttpHandler;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  title?: string;
}

interface UseAssistantContext {
  apiConfig: AssistantUiSettings;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  conversationIds: string[];
  conversations: Record<string, Conversation>;
  getComments: ({
    currentConversation,
    lastCommentRef,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  }) => EuiCommentProps[];
  httpFetch: HttpHandler;
  promptContexts: Record<string, PromptContext>;
  registerPromptContext: RegisterPromptContext;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
  showAssistantOverlay: ShowAssistantOverlay;
  title: string;
  unRegisterPromptContext: UnRegisterPromptContext;
}

const AssistantContext = React.createContext<UseAssistantContext | undefined>(undefined);

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  apiConfig,
  augmentMessageCodeBlocks,
  children,
  conversations,
  getComments,
  httpFetch,
  setConversations,
  title = DEFAULT_ASSISTANT_TITLE,
}) => {
  /**
   * Prompt contexts are used to provide components a way to register and make their data available to the assistant.
   */
  const [promptContexts, setQueryContexts] = useState<Record<string, PromptContext>>({});

  const registerPromptContext: RegisterPromptContext = useCallback(
    (promptContext: PromptContext) => {
      setQueryContexts((prevPromptContexts) =>
        updatePromptContexts({
          prevPromptContexts,
          promptContext,
        })
      );
    },
    []
  );

  const unRegisterPromptContext: UnRegisterPromptContext = useCallback(
    (queryContextId: string) =>
      setQueryContexts((prevQueryContexts) => omit(queryContextId, prevQueryContexts)),
    []
  );

  /**
   * Global Assistant Overlay actions
   */
  const [showAssistantOverlay, setShowAssistantOverlay] = useState<ShowAssistantOverlay>(
    (showAssistant) => {}
  );

  const value = useMemo(
    () => ({
      apiConfig,
      augmentMessageCodeBlocks,
      conversationIds: Object.keys(conversations).sort(),
      conversations,
      getComments,
      httpFetch,
      promptContexts,
      registerPromptContext,
      setConversations,
      setShowAssistantOverlay,
      showAssistantOverlay,
      title,
      unRegisterPromptContext,
    }),
    [
      apiConfig,
      augmentMessageCodeBlocks,
      conversations,
      getComments,
      httpFetch,
      promptContexts,
      registerPromptContext,
      setConversations,
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
