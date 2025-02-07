/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { AIConnector } from '../../connectorland/connector_selector';
import { getDefaultSystemPrompt } from '../use_conversation/helpers';
import { useConversation } from '../use_conversation';
import { sleep } from '../helpers';
import { Conversation } from '../../..';

export interface Props {
  allSystemPrompts: PromptResponse[];
  conversationId: string;
  conversations: Record<string, Conversation>;
  defaultConnector?: AIConnector;
  mayUpdateConversations: boolean;
  refetchCurrentUserConversations: () => Promise<
    QueryObserverResult<Record<string, Conversation>, unknown>
  >;
}

interface UseCurrentConversation {
  currentConversation: Conversation | undefined;
  currentSystemPrompt: PromptResponse | undefined;
  handleCreateConversation: () => Promise<void>;
  handleOnConversationDeleted: (cTitle: string) => Promise<void>;
  handleOnConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => Promise<void>;
  refetchCurrentConversation: (options?: {
    cId?: string;
    cTitle?: string;
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
  useEffect(() => {
    if (!mayUpdateConversations || !!currentConversation) return;
    if (conversationId === '') {
      return setCurrentConversation({
        apiConfig: defaultConnector
          ? {
              connectorId: defaultConnector.id ?? '',
              actionTypeId: defaultConnector.actionTypeId ?? '',
            }
          : undefined,
        id: '',
        messages: [],
        replacements: {},
        category: 'assistant',
        title: '',
      });
    }
    if (conversations[conversationId]) {
      setCurrentConversation(conversations[conversationId]);
    }
  }, [
    conversationId,
    conversations,
    currentConversation,
    defaultConnector,
    mayUpdateConversations,
  ]);
  /**
   * START SYSTEM PROMPT
   */
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
      if (currentConversation && currentConversation.apiConfig) {
        await setApiConfig({
          conversation: currentConversation,
          apiConfig: {
            ...currentConversation.apiConfig,
            defaultSystemPromptId: promptId,
          },
        });
        await refetchCurrentUserConversations();
      }
    },
    [currentConversation, refetchCurrentUserConversations, setApiConfig]
  );

  /**
   * END SYSTEM PROMPT
   */

  /**
   * Refetches the current conversation, optionally by conversation ID or title.
   * @param cId - The conversation ID to refetch.
   * @param cTitle - The conversation title to refetch.
   * @param isStreamRefetch - Are we refetching because stream completed? If so retry several times to ensure the message has updated on the server
   */
  const refetchCurrentConversation = useCallback(
    async ({
      cId,
      cTitle,
      isStreamRefetch = false,
    }: { cId?: string; cTitle?: string; isStreamRefetch?: boolean } = {}) => {
      if (cId === '') {
        return;
      }
      const cConversationId =
        cId ?? (cTitle && conversations[cTitle].id) ?? currentConversation?.id;

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
    [conversations, currentConversation?.id, getConversation]
  );

  const handleOnConversationSelected = useCallback(
    async ({ cId, cTitle }: { cId: string; cTitle: string }) => {
      if (cId === '') {
        return setCurrentConversation({
          // get apiConfig from currentConversation
          ...currentConversation,
          id: '',
          messages: [],
          replacements: {},
          category: 'assistant',
          title: '',
        });
      }
      // refetch will set the currentConversation
      await refetchCurrentConversation({ cId, cTitle });
    },
    [currentConversation, refetchCurrentConversation]
  );

  const handleOnConversationDeleted = useCallback(
    async (cTitle: string) => {
      await deleteConversation(conversations[cTitle].id);
      await refetchCurrentUserConversations();
    },
    [conversations, deleteConversation, refetchCurrentUserConversations]
  );

  const handleCreateConversation = useCallback(async () => {
    handleOnConversationSelected({
      cId: '',
      cTitle: '',
    });
  }, [handleOnConversationSelected]);

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
