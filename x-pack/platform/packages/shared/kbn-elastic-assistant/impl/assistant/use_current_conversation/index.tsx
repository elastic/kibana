/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/react-query';
import { ApiConfig, PromptResponse } from '@kbn/elastic-assistant-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FetchConversationsResponse } from '../api';
import { AIConnector } from '../../connectorland/connector_selector';
import { getDefaultNewSystemPrompt, getDefaultSystemPrompt } from '../use_conversation/helpers';
import { useConversation } from '../use_conversation';
import { sleep } from '../helpers';
import { Conversation } from '../../..';
import type { LastConversation } from '../use_space_aware_context';

export interface Props {
  allSystemPrompts: PromptResponse[];
  connectors?: AIConnector[];
  currentAppId?: string;
  lastConversation: LastConversation;
  conversations: Record<string, Conversation>;
  defaultConnector?: AIConnector;
  spaceId: string;
  mayUpdateConversations: boolean;
  refetchCurrentUserConversations: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
  ) => Promise<QueryObserverResult<InfiniteData<FetchConversationsResponse>, unknown>>;
  setLastConversation: (lastConversation: LastConversation) => void;
}

interface UseCurrentConversation {
  currentConversation: Conversation | undefined;
  currentSystemPrompt: PromptResponse | undefined;
  handleCreateConversation: () => Promise<void>;
  handleOnConversationDeleted: (cTitle: string) => Promise<void>;
  handleOnConversationSelected: ({
    cId,
    cTitle,
  }: {
    cId: string;
    cTitle?: string;
  }) => Promise<void>;
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
  connectors,
  currentAppId,
  lastConversation,
  conversations,
  spaceId,
  defaultConnector,
  mayUpdateConversations,
  refetchCurrentUserConversations,
  setLastConversation,
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
    async ({
      cId,
      isStreamRefetch = false,
      silent,
    }: { cId?: string; isStreamRefetch?: boolean; silent?: boolean } = {}) => {
      if (cId === '') {
        return;
      }
      const cConversationId = cId ?? currentConversation?.id;

      if (cConversationId) {
        let updatedConversation = await getConversation(cConversationId, silent);
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

  const getNewConversation = useCallback(
    ({ cTitle, apiConfig: providedApiConfig }: { apiConfig?: ApiConfig; cTitle?: string }) => {
      const apiConfig =
        providedApiConfig ??
        (currentConversation?.apiConfig
          ? currentConversation.apiConfig
          : defaultConnector
          ? {
              connectorId: defaultConnector.id ?? '',
              actionTypeId: defaultConnector.actionTypeId ?? '',
            }
          : undefined);

      const newConversationDefaultSystemPrompt = getDefaultNewSystemPrompt(allSystemPrompts);
      setLastConversation({
        id: '',
        title: cTitle ?? '',
      });
      return setCurrentConversation({
        ...(apiConfig
          ? {
              apiConfig: {
                ...apiConfig,
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
        title: cTitle ?? '',
      });
    },
    [allSystemPrompts, currentConversation?.apiConfig, defaultConnector, setLastConversation]
  );
  useEffect(() => {
    if (defaultConnector && !currentConversation?.apiConfig && currentConversation?.id === '') {
      // first connector created, provide nothing to getNewConversation
      // to set new conversation with the defaultConnector
      getNewConversation({});
    }
  }, [defaultConnector, currentConversation, getNewConversation]);
  const [localSecuritySolutionAssistantConnectorId] = useLocalStorage<string | undefined>(
    `securitySolution.onboarding.assistantCard.connectorId.${spaceId}`
  );

  const handleOnConversationSelected = useCallback(
    async ({
      cId,
      cTitle,
      apiConfig,
      silent,
    }: {
      apiConfig?: ApiConfig;
      cId: string;
      cTitle?: string;
      silent?: boolean;
    }) => {
      if (cId === '') {
        if (
          currentAppId === 'securitySolutionUI' &&
          localSecuritySolutionAssistantConnectorId &&
          !apiConfig &&
          connectors?.length
        ) {
          const configuredConnector = connectors.find(
            (connector) => connector.id === localSecuritySolutionAssistantConnectorId
          );
          if (configuredConnector) {
            return getNewConversation({
              apiConfig: {
                connectorId: configuredConnector.id,
                actionTypeId: configuredConnector.actionTypeId,
              },
              cTitle,
            });
          }
        }
        return getNewConversation({ apiConfig, cTitle });
      }
      // refetch will set the currentConversation
      try {
        await refetchCurrentConversation({ cId, silent });
        setLastConversation({
          id: cId,
        });
      } catch (e) {
        getNewConversation({ apiConfig, cTitle });
        throw e;
      }
    },
    [
      connectors,
      currentAppId,
      getNewConversation,
      localSecuritySolutionAssistantConnectorId,
      refetchCurrentConversation,
      setLastConversation,
    ]
  );

  useEffect(() => {
    if (!mayUpdateConversations || !!currentConversation) return;
    handleOnConversationSelected({
      cId: lastConversation.id,
      cTitle: lastConversation.title,
      silent: true,
    });
  }, [lastConversation, handleOnConversationSelected, currentConversation, mayUpdateConversations]);

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
