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
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';
import { getDefaultSystemPrompt } from '../use_conversation/helpers';
import { UseConversation } from '../use_conversation';
import { sleep } from '../helpers';
import { Conversation } from '../../..';
interface Props {
  allSystemPrompts: PromptResponse[];
  conversations: Record<string, Conversation>;
  createConversation: UseConversation['createConversation'];
  deleteConversation: UseConversation['deleteConversation'];
  getConversation: UseConversation['getConversation'];
  refetchCurrentUserConversations: () => Promise<
    QueryObserverResult<Record<string, Conversation>, unknown>
  >;
  setConversationTitle?: Dispatch<SetStateAction<string>>;
}
export const useCurrentConversation = ({
  allSystemPrompts,
  conversations,
  createConversation,
  deleteConversation,
  getConversation,
  refetchCurrentUserConversations,
  setConversationTitle,
}: Props) => {
  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (setConversationTitle && currentConversation?.title) {
      setConversationTitle(currentConversation?.title);
    }
  }, [currentConversation?.title, setConversationTitle]);

  const refetchCurrentConversation = useCallback(
    async ({
      cId,
      cTitle,
      isStreamRefetch = false,
    }: { cId?: string; cTitle?: string; isStreamRefetch?: boolean } = {}) => {
      if (cId === '' || (cTitle && !conversations[cTitle])) {
        return;
      }

      const conversationId = cId ?? (cTitle && conversations[cTitle].id) ?? currentConversation?.id;

      if (conversationId) {
        let updatedConversation = await getConversation(conversationId);
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
          updatedConversation = await getConversation(conversationId);
        }

        if (updatedConversation) {
          setCurrentConversation(updatedConversation);
        }

        return updatedConversation;
      }
    },
    [conversations, currentConversation?.id, getConversation]
  );
  const selectedSystemPrompt = useMemo(
    () =>
      getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: currentConversation,
      }),
    [allSystemPrompts, currentConversation]
  );

  const [currentSystemPromptId, setCurrentSystemPromptId] = useState<string | undefined>(
    selectedSystemPrompt?.id
  );

  const handleOnSystemPromptSelectionChange = useCallback((systemPromptId?: string) => {
    setCurrentSystemPromptId(systemPromptId);
  }, []);

  const handleOnConversationSelected = useCallback(
    async ({ cId, cTitle }: { cId: string; cTitle: string }) => {
      const updatedConv = await refetchCurrentUserConversations();

      let selectedConversation;
      if (cId === '') {
        setCurrentConversationId(cTitle);
        selectedConversation = updatedConv?.data?.[cTitle];
        setCurrentConversationId(cTitle);
      } else {
        selectedConversation = await refetchCurrentConversation({ cId });
        setCurrentConversationId(cId);
      }
      setCurrentSystemPromptId(
        getDefaultSystemPrompt({
          allSystemPrompts,
          conversation: selectedConversation,
        })?.id
      );
    },
    [
      allSystemPrompts,
      refetchCurrentConversation,
      refetchCurrentUserConversations,
      setCurrentConversationId,
    ]
  );

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

    const newConversation = await createConversation({
      title: NEW_CHAT,
      apiConfig: currentConversation?.apiConfig,
    });

    await refetchCurrentUserConversations();

    if (newConversation) {
      handleOnConversationSelected({
        cId: newConversation.id,
        cTitle: newConversation.title,
      });
    }
  }, [
    conversations,
    createConversation,
    currentConversation?.apiConfig,
    handleOnConversationSelected,
    refetchCurrentUserConversations,
  ]);
  return {
    currentConversation,
    currentConversationId,
    currentSystemPromptId,
    handleCreateConversation,
    handleOnConversationDeleted,
    handleOnConversationSelected,
    handleOnSystemPromptSelectionChange,
    refetchCurrentConversation,
    setCurrentConversation,
    setCurrentConversationId,
    setCurrentSystemPromptId,
  };
};
