/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { InfiniteData } from '@tanstack/query-core/src/types';
import { FetchConversationsResponse } from '../api';
import { AIConnector } from '../../connectorland/connector_selector';
import { getDefaultNewSystemPrompt, getDefaultSystemPrompt } from '../use_conversation/helpers';
import { useConversation } from '../use_conversation';
import { sleep } from '../helpers';
import { Conversation } from '../../..';

export interface Props {
  allSystemPrompts: PromptResponse[];
  conversationId: string;
  conversations: Record<string, Conversation>;
  defaultConnector?: AIConnector;
  mayUpdateConversations: boolean;
  refetchCurrentUserConversations: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
  ) => Promise<QueryObserverResult<InfiniteData<FetchConversationsResponse>, unknown>>;
}

interface UseCurrentConversation {
  currentConversation: Conversation | undefined;
  currentSystemPrompt: PromptResponse | undefined;
  handleCreateConversation: () => Promise<void>;
  handleOnConversationDeleted: (cTitle: string) => Promise<void>;
  handleOnConversationSelected: ({ cId }: { cId: string }) => Promise<void>;
  refetchCurrentConversation: (options?: {
    cId?: string;
    isStreamRefetch?: boolean;
  }) => Promise<Conversation | undefined>;
  setCurrentConversation: Dispatch<SetStateAction<Conversation | undefined>>;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
}

/**
 * Manages the current conversation state. Interacts with the conversation API and keeps local state up to date.
 * Manages system prompt as that is per conversation
 * Provides methods to handle conversation selection, creation, deletion, and system prompt selection.
 */
export const useCurrentConversation = ({
  allSystemPrompts,
  conversationId,
  conversations,
  defaultConnector,
  mayUpdateConversations,
  refetchCurrentUserConversations,
}: Props): UseCurrentConversation => {
  const { deleteConversation, getConversation, setApiConfig } = useConversation();
  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>();

  const currentSystemPrompt = useMemo(
    () =>
      getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: currentConversation,
      }),
    [allSystemPrompts, currentConversation]
  );

  // Write the selected system prompt to the conversation config
  const setCurrentSystemPromptId = useCallback(
    async (promptId?: string) => {
      if (currentConversation?.id === '') {
        return setCurrentConversation({
          ...currentConversation,
          apiConfig: currentConversation?.apiConfig
            ? {
                ...currentConversation?.apiConfig,
                defaultSystemPromptId: promptId,
              }
            : undefined,
          id: '',
          messages: [],
          replacements: {},
          category: 'assistant',
          title: '',
        });
      }
      if (currentConversation && currentConversation.apiConfig) {
        const updatedConversation = await setApiConfig({
          conversation: currentConversation,
          apiConfig: {
            ...currentConversation.apiConfig,
            defaultSystemPromptId: promptId,
          },
        });

        if (updatedConversation) {
          setCurrentConversation(updatedConversation);
        }
        await refetchCurrentUserConversations();
      }
    },
    [currentConversation, refetchCurrentUserConversations, setApiConfig]
  );

  /**
   * Refetches the current conversation, optionally by conversation ID or title.
   * @param cId - The conversation ID to refetch.
   * @param cTitle - The conversation title to refetch.
   * @param isStreamRefetch - Are we refetching because stream completed? If so retry several times to ensure the message has updated on the server
   */
  const refetchCurrentConversation = useCallback(
    async ({ cId, isStreamRefetch = false }: { cId?: string; isStreamRefetch?: boolean } = {}) => {
      if (cId === '') {
        return;
      }
      const cConversationId = cId ?? currentConversation?.id;

      if (cConversationId) {
        let updatedConversation = await getConversation(cConversationId);
        let retries = 0;
        const maxRetries = 5;

        // this retry is a workaround for the stream not YET being persisted to the stored conversation
        while (
          isStreamRefetch &&
          updatedConversation &&
          updatedConversation.messages[updatedConversation.messages.length - 1].role !==
            'assistant' &&
          retries < maxRetries
        ) {
          retries++;
          await sleep(2000);
          updatedConversation = await getConversation(cConversationId);
        }

        if (updatedConversation) {
          setCurrentConversation(updatedConversation);
        }

        return updatedConversation;
      }
    },
    [currentConversation?.id, getConversation]
  );

  const handleOnConversationSelected = useCallback(
    async ({ cId }: { cId: string }) => {
      if (cId === '') {
        const apiConfig = defaultConnector
          ? {
              connectorId: defaultConnector.id ?? '',
              actionTypeId: defaultConnector.actionTypeId ?? '',
            }
          : undefined;

        // Merge apiConfig from currentConversation if it exists
        const mergedApiConfig = currentConversation?.apiConfig
          ? currentConversation.apiConfig
          : apiConfig;
        const newConversationDefaultSystemPrompt = getDefaultNewSystemPrompt(allSystemPrompts);
        return setCurrentConversation({
          ...(mergedApiConfig
            ? {
                apiConfig: {
                  ...mergedApiConfig,
                  ...(newConversationDefaultSystemPrompt?.id
                    ? { defaultSystemPromptId: newConversationDefaultSystemPrompt?.id }
                    : {}),
                },
              }
            : {}),
          id: '',
          messages: [],
          replacements: {},
          category: 'assistant',
          title: '',
        });
      }
      // refetch will set the currentConversation
      await refetchCurrentConversation({ cId });
    },
    [allSystemPrompts, currentConversation?.apiConfig, defaultConnector, refetchCurrentConversation]
  );
  useEffect(() => {
    if (!mayUpdateConversations || !!currentConversation) return;
    handleOnConversationSelected({ cId: conversationId ?? '' });
  }, [conversationId, handleOnConversationSelected, currentConversation, mayUpdateConversations]);

  const handleOnConversationDeleted = useCallback(
    async (cTitle: string) => {
      await deleteConversation(conversations[cTitle].id);
      await refetchCurrentUserConversations();
    },
    [conversations, deleteConversation, refetchCurrentUserConversations]
  );

  const handleCreateConversation = useCallback(
    async () =>
      handleOnConversationSelected({
        cId: '',
      }),
    [handleOnConversationSelected]
  );

  return {
    currentConversation,
    currentSystemPrompt,
    handleCreateConversation,
    handleOnConversationDeleted,
    handleOnConversationSelected,
    refetchCurrentConversation,
    setCurrentConversation,
    setCurrentSystemPromptId,
  };
};
