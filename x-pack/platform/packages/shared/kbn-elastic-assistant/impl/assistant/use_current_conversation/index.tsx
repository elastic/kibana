/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@kbn/react-query';
import type {
  ApiConfig,
  PromptResponse,
  User,
  ConversationSharedState,
} from '@kbn/elastic-assistant-common';
import { getIsConversationOwner, getConversationSharedState } from '@kbn/elastic-assistant-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { FetchConversationsResponse } from '../api';
import type { AIConnector } from '../../connectorland/connector_selector';
import { getDefaultNewSystemPrompt, getDefaultSystemPrompt } from '../use_conversation/helpers';
import { useConversation } from '../use_conversation';
import { sleep } from '../helpers';
import type { Conversation } from '../../..';
import type { LastConversation } from '../use_space_aware_context';

export interface Props {
  allSystemPrompts: PromptResponse[];
  connectors?: AIConnector[];
  currentAppId?: string;
  currentUser?: User;
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
  conversationSharedState: ConversationSharedState;
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
  isConversationOwner: boolean;
  refetchCurrentConversation: (options?: {
    cId?: string;
    isStreamRefetch?: boolean;
  }) => Promise<Conversation | undefined>;
  setCurrentConnector: (connectorApiConfig: ConnectorApiConfig) => Promise<void>;
  setCurrentConversation: Dispatch<SetStateAction<Conversation | undefined>>;
  setCurrentSystemPromptId: (promptId: string | undefined) => void;
}

export type ConnectorApiConfig = Pick<
  ApiConfig,
  'actionTypeId' | 'connectorId' | 'model' | 'provider'
>;

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
  currentUser,
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

  const apiConfigWrites = useRef<{
    latest?: { conversationId: string; apiConfig: ApiConfig };
    pending: number;
    queue: Promise<void>;
  }>({ pending: 0, queue: Promise.resolve() });

  /**
   * The server stores the apiConfig it receives as a whole, so a change is merged on top of the
   * changes still in flight rather than on the (possibly stale) `conversation`, and the writes are
   * sent one at a time. Otherwise concurrent changes, e.g. picking a connector and then a system
   * prompt, overwrite each other. Only the last write's response holds every change, so it is the
   * only one applied to the current conversation.
   */
  const updateApiConfig = useCallback(
    async (conversation: Conversation, apiConfigUpdate: Partial<ApiConfig>) => {
      const writes = apiConfigWrites.current;
      const mergedApiConfig = {
        ...(writes.latest?.conversationId === conversation.id
          ? writes.latest.apiConfig
          : conversation.apiConfig),
        ...apiConfigUpdate,
      };
      const { connectorId, actionTypeId } = mergedApiConfig;
      if (connectorId == null || actionTypeId == null) {
        return;
      }
      const apiConfig: ApiConfig = { ...mergedApiConfig, connectorId, actionTypeId };

      writes.latest = { conversationId: conversation.id, apiConfig };
      writes.pending++;
      const write = writes.queue.then(() => setApiConfig({ conversation, apiConfig }));
      writes.queue = write.then(
        () => undefined,
        () => undefined
      );

      try {
        const updatedConversation = await write;
        if (updatedConversation && writes.pending === 1) {
          setCurrentConversation((prev) =>
            prev?.id === updatedConversation.id ? updatedConversation : prev
          );
        }
      } finally {
        writes.pending--;
        if (writes.pending === 0) {
          writes.latest = undefined;
        }
      }
    },
    [setApiConfig]
  );

  const setCurrentConnector = useCallback(
    async (connectorApiConfig: ConnectorApiConfig) => {
      if (currentConversation) {
        await updateApiConfig(currentConversation, connectorApiConfig);
      }
    },
    [currentConversation, updateApiConfig]
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
        await updateApiConfig(currentConversation, { defaultSystemPromptId: promptId });
        await refetchCurrentUserConversations();
      }
    },
    [currentConversation, refetchCurrentUserConversations, updateApiConfig]
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
        users: [currentUser ?? {}],
        createdBy: currentUser ?? {},
        createdAt: new Date().toISOString(),
        messages: [],
        replacements: {},
        category: 'assistant',
        title: cTitle ?? '',
      });
    },
    [
      allSystemPrompts,
      currentConversation?.apiConfig,
      currentUser,
      defaultConnector,
      setLastConversation,
    ]
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
      silent: false,
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

  // is current user the owner of the conversation?
  const isConversationOwner = useMemo(
    () => getIsConversationOwner(currentConversation, currentUser),
    [currentConversation, currentUser]
  );

  const conversationSharedState = useMemo(
    () => getConversationSharedState(currentConversation),
    [currentConversation]
  );

  return {
    conversationSharedState,
    currentConversation,
    currentSystemPrompt,
    handleCreateConversation,
    handleOnConversationDeleted,
    handleOnConversationSelected,
    isConversationOwner,
    refetchCurrentConversation,
    setCurrentConnector,
    setCurrentConversation,
    setCurrentSystemPromptId,
  };
};
