/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Conversation, ConversationsBulkActions } from '../../../..';

interface Props {
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
}

export const useConversationDeleted = ({
  conversationSettings,
  conversationsSettingsBulkActions,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}: Props) => {
  const onConversationDeleted = useCallback(
    (conversationTitle: string) => {
      const conversationId = Object.values(conversationSettings).find(
        (c) => c.title === conversationTitle
      )?.id;
      // If matching conversation is not found, do nothing
      if (!conversationId) {
        return;
      }

      const updatedConversationSettings = { ...conversationSettings };
      delete updatedConversationSettings[conversationId];

      setConversationSettings(updatedConversationSettings);
      setConversationsSettingsBulkActions({
        ...conversationsSettingsBulkActions,
        delete: {
          ids: [...(conversationsSettingsBulkActions.delete?.ids ?? []), conversationId],
        },
      });
    },
    [
      conversationSettings,
      conversationsSettingsBulkActions,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    ]
  );

  return onConversationDeleted;
};
