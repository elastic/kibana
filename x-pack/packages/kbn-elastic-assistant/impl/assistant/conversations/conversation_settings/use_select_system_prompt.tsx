/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { Conversation, Prompt } from '../../../..';
import { ConversationsBulkActions } from '../../api';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';

interface Props {
  allSystemPrompts: Prompt[];
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  selectedConversation?: Conversation;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
}
export const useSelectSystemPrompt = ({
  allSystemPrompts,
  conversationSettings,
  conversationsSettingsBulkActions,
  selectedConversation,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}: Props) => {
  const selectedSystemPrompt = useMemo(() => {
    return getDefaultSystemPrompt({ allSystemPrompts, conversation: selectedConversation });
  }, [allSystemPrompts, selectedConversation]);
  const handleOnSystemPromptSelectionChange = useCallback(
    (systemPromptId?: string | undefined) => {
      if (selectedConversation != null && selectedConversation.apiConfig) {
        const updatedConversation = {
          ...selectedConversation,
          apiConfig: {
            ...selectedConversation.apiConfig,
            defaultSystemPromptId: systemPromptId,
          },
        };
        setConversationSettings({
          ...conversationSettings,
          [updatedConversation.id]: updatedConversation,
        });
        if (selectedConversation.id !== '') {
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            update: {
              ...(conversationsSettingsBulkActions.update ?? {}),
              [updatedConversation.id]: {
                ...updatedConversation,
                ...(conversationsSettingsBulkActions.update
                  ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                  : {}),
                apiConfig: {
                  ...updatedConversation.apiConfig,
                  ...((conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                    : {}
                  ).apiConfig ?? {}),
                  defaultSystemPromptId: systemPromptId,
                },
              },
            },
          });
        } else {
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            create: {
              ...(conversationsSettingsBulkActions.create ?? {}),
              [updatedConversation.id]: updatedConversation,
            },
          });
        }
      }
    },
    [
      conversationSettings,
      conversationsSettingsBulkActions,
      selectedConversation,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    ]
  );

  return {
    selectedSystemPrompt,
    handleOnSystemPromptSelectionChange,
  };
};
