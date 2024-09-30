/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { find } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { AIConnector } from '../../connectorland/connector_selector';
import { getGenAiConfig } from '../../connectorland/helpers';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';
import { getDefaultNewSystemPrompt, getDefaultSystemPrompt } from '../use_conversation/helpers';
import { useConversation } from '../use_conversation';
import { sleep } from '../helpers';
import { Conversation, WELCOME_CONVERSATION_TITLE } from '../../..';

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
  const {
    createConversation,
    deleteConversation,
    getConversation,
    getDefaultConversation,
    setApiConfig,
  } = useConversation();
  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
    conversationId
  );
  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);
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
      if (cId === '' || (cTitle && !conversations[cTitle])) {
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

  const initializeDefaultConversationWithConnector = useCallback(
    async (defaultConvo: Conversation): Promise<Conversation> => {
      const apiConfig = getGenAiConfig(defaultConnector);
      const updatedConvo =
        (await setApiConfig({
          conversation: defaultConvo,
          apiConfig: {
            ...defaultConvo?.apiConfig,
            connectorId: (defaultConnector?.id as string) ?? '',
            actionTypeId: (defaultConnector?.actionTypeId as string) ?? '.gen-ai',
            provider: apiConfig?.apiProvider,
            model: apiConfig?.defaultModel,
            defaultSystemPromptId: allSystemPrompts.find((sp) => sp.isNewConversationDefault)?.id,
          },
        })) ?? defaultConvo;
      await refetchCurrentUserConversations();
      return updatedConvo;
    },
    [allSystemPrompts, defaultConnector, refetchCurrentUserConversations, setApiConfig]
  );

  const handleOnConversationSelected = useCallback(
    async ({ cId, cTitle }: { cId: string; cTitle: string }) => {
      const allConversations = await refetchCurrentUserConversations();

      // This is a default conversation that has not yet been initialized
      // add the default connector config
      if (cId === '' && allConversations?.data?.[cTitle]) {
        const updatedConvo = await initializeDefaultConversationWithConnector(
          allConversations.data[cTitle]
        );
        setCurrentConversationId(updatedConvo.id);
      } else if (allConversations?.data?.[cId]) {
        setCurrentConversationId(cId);
      }
    },
    [
      initializeDefaultConversationWithConnector,
      refetchCurrentUserConversations,
      setCurrentConversationId,
    ]
  );

  // update currentConversation when conversations or currentConversationId update
  useEffect(() => {
    if (!mayUpdateConversations) return;
    const updateConversation = async () => {
      const nextConversation: Conversation =
        (currentConversationId && conversations[currentConversationId]) ||
        // if currentConversationId is not an id, it should be a title from a
        // default conversation that has not yet been initialized
        find(conversations, ['title', currentConversationId]) ||
        find(conversations, ['title', WELCOME_CONVERSATION_TITLE]) ||
        // if no Welcome convo exists, create one
        getDefaultConversation({ cTitle: WELCOME_CONVERSATION_TITLE });

      if (nextConversation && nextConversation.id === '') {
        // This is a default conversation that has not yet been initialized
        const conversation = await initializeDefaultConversationWithConnector(nextConversation);
        return setCurrentConversation(conversation);
      }
      setCurrentConversation((prev) => {
        if (deepEqual(prev, nextConversation)) return prev;

        if (
          prev &&
          prev.id === nextConversation.id &&
          // if the conversation id has not changed and the previous conversation has more messages
          // it is because the local conversation has a readable stream running
          // and it has not yet been persisted to the stored conversation
          prev.messages.length > nextConversation.messages.length
        ) {
          return {
            ...nextConversation,
            messages: prev.messages,
          };
        }

        return nextConversation;
      });
    };
    updateConversation();
  }, [
    currentConversationId,
    conversations,
    getDefaultConversation,
    initializeDefaultConversationWithConnector,
    mayUpdateConversations,
  ]);

  const handleOnConversationDeleted = useCallback(
    async (cTitle: string) => {
      await deleteConversation(conversations[cTitle].id);
      await refetchCurrentUserConversations();
    },
    [conversations, deleteConversation, refetchCurrentUserConversations]
  );

  const handleCreateConversation = useCallback(async () => {
    const newChatExists = find(conversations, ['title', NEW_CHAT]);
    if (newChatExists && !newChatExists.messages.length) {
      handleOnConversationSelected({
        cId: newChatExists.id,
        cTitle: newChatExists.title,
      });
      return;
    }
    const newSystemPrompt = getDefaultNewSystemPrompt(allSystemPrompts);

    const newConversation = await createConversation({
      title: NEW_CHAT,
      ...(currentConversation?.apiConfig != null &&
      currentConversation?.apiConfig?.actionTypeId != null
        ? {
            apiConfig: {
              connectorId: currentConversation.apiConfig.connectorId,
              actionTypeId: currentConversation.apiConfig.actionTypeId,
              ...(newSystemPrompt?.id != null ? { defaultSystemPromptId: newSystemPrompt.id } : {}),
            },
          }
        : {}),
    });

    if (newConversation) {
      handleOnConversationSelected({
        cId: newConversation.id,
        cTitle: newConversation.title,
      });
    } else {
      await refetchCurrentUserConversations();
    }
  }, [
    allSystemPrompts,
    conversations,
    createConversation,
    currentConversation?.apiConfig,
    handleOnConversationSelected,
    refetchCurrentUserConversations,
  ]);

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
