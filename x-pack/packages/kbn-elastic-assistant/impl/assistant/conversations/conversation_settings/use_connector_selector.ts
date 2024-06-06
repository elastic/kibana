/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { Conversation, ConversationsBulkActions } from '../../../..';
import { getGenAiConfig } from '../../../connectorland/helpers';

interface Props {
  selectedConversation?: Conversation;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  conversationSettings: Record<string, Conversation>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  conversationsSettingsBulkActions: ConversationsBulkActions;
}

export const useConnectorSelector = ({
  selectedConversation,
  setConversationSettings,
  conversationSettings,
  setConversationsSettingsBulkActions,
  conversationsSettingsBulkActions,
}: Props) => {
  const selectedConversationId = useMemo(
    () =>
      selectedConversation?.id === ''
        ? selectedConversation.title
        : (selectedConversation?.id as string),
    [selectedConversation]
  );
  const handleOnConnectorSelectionChange = useCallback(
    (connector) => {
      if (selectedConversation != null) {
        const config = getGenAiConfig(connector);
        const updatedConversation = {
          ...selectedConversation,
          apiConfig: {
            ...selectedConversation.apiConfig,
            connectorId: connector.id,
            actionTypeId: connector.actionTypeId,
            provider: config?.apiProvider,
            model: config?.defaultModel,
          },
        };
        setConversationSettings({
          ...conversationSettings,
          [selectedConversationId]: updatedConversation,
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
                  connectorId: connector?.id,
                  actionTypeId: connector?.actionTypeId,
                  provider: config?.apiProvider,
                  model: config?.defaultModel,
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
      selectedConversationId,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    ]
  );

  return handleOnConnectorSelectionChange;
};
