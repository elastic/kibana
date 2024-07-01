/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { Conversation, Prompt } from '../../../..';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';
import { ConversationsBulkActions } from '../../api';
import { AIConnector } from '../../../connectorland/connector_selector';

interface Props {
  allSystemPrompts: Prompt[];
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  defaultConnector?: AIConnector;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  onSelectedConversationChange: (conversation?: Conversation) => void;
}

type OnConversationSelectionChange = (c?: string | Conversation) => void;

export const useConversationChanged = ({
  allSystemPrompts,
  conversationSettings,
  conversationsSettingsBulkActions,
  defaultConnector,
  setConversationSettings,
  setConversationsSettingsBulkActions,
  onSelectedConversationChange,
}: Props) => {
  const defaultSystemPrompt = useMemo(() => {
    return getDefaultSystemPrompt({ allSystemPrompts, conversation: undefined });
  }, [allSystemPrompts]);

  // Conversation callbacks
  // When top level conversation selection changes
  const onConversationSelectionChange: OnConversationSelectionChange = useCallback(
    (c = '') => {
      const isNew = typeof c === 'string';
      const newSelectedConversation: Conversation | undefined = isNew
        ? {
            id: '',
            title: c ?? '',
            category: 'assistant',
            messages: [],
            replacements: {},
            ...(defaultConnector
              ? {
                  apiConfig: {
                    connectorId: defaultConnector.id,
                    actionTypeId: defaultConnector.actionTypeId,
                    provider: defaultConnector.apiProvider,
                    defaultSystemPromptId: defaultSystemPrompt?.id,
                  },
                }
              : {}),
          }
        : c;

      if (newSelectedConversation && (isNew || newSelectedConversation.id === '')) {
        setConversationSettings({
          ...conversationSettings,
          [isNew ? c : newSelectedConversation.title]: newSelectedConversation,
        });
        setConversationsSettingsBulkActions({
          ...conversationsSettingsBulkActions,
          create: {
            ...(conversationsSettingsBulkActions.create ?? {}),
            [newSelectedConversation.title]: newSelectedConversation,
          },
        });
      } else if (newSelectedConversation != null) {
        setConversationSettings((prev) => {
          return {
            ...prev,
            [newSelectedConversation.id]: newSelectedConversation,
          };
        });
      }

      onSelectedConversationChange({
        ...newSelectedConversation,
        id: newSelectedConversation.id || newSelectedConversation.title,
      });
    },
    [
      conversationSettings,
      conversationsSettingsBulkActions,
      defaultConnector,
      defaultSystemPrompt?.id,
      onSelectedConversationChange,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    ]
  );

  return onConversationSelectionChange;
};
