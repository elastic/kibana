/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Conversation } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import {
  ConversationsBulkActions,
  bulkUpdateConversations,
} from '../../api/conversations/bulk_update_actions_conversations';

interface UseConversationsUpdater {
  assistantStreamingEnabled: boolean;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onConversationDeleted: (cId: string) => void;
  resetConversationsSettings: () => void;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  setUpdatedAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  saveConversationsSettings: (bulkActions?: ConversationsBulkActions) => Promise<boolean>;
}

export const useConversationsUpdater = (
  conversations: Record<string, Conversation>,
  conversationsLoaded: boolean
): UseConversationsUpdater => {
  // Initial state from assistant context
  const {
    assistantTelemetry,
    assistantStreamingEnabled,
    setAssistantStreamingEnabled,
    http,
    toasts,
  } = useAssistantContext();

  const [conversationSettings, setConversationSettings] =
    useState<Record<string, Conversation>>(conversations);
  const [conversationsSettingsBulkActions, setConversationsSettingsBulkActions] =
    useState<ConversationsBulkActions>({});

  const [updatedAssistantStreamingEnabled, setUpdatedAssistantStreamingEnabled] =
    useState<boolean>(assistantStreamingEnabled);

  const resetConversationsSettings = useCallback((): void => {
    setConversationSettings(conversations);
    setConversationsSettingsBulkActions({});

    setUpdatedAssistantStreamingEnabled(assistantStreamingEnabled);
  }, [assistantStreamingEnabled, conversations]);

  const onConversationDeleted = useCallback(
    (cId: string) => {
      const conversationId = Object.values(conversations).find((c) => c.id === cId)?.id;
      // If matching conversation is not found, do nothing
      if (!conversationId) {
        return;
      }

      const updatedConversationSettings = { ...conversations };
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
      conversations,
      conversationsSettingsBulkActions,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    ]
  );
  /**
   * Save all pending settings
   */
  const saveConversationsSettings = useCallback(
    async (bulkActions?: ConversationsBulkActions): Promise<boolean> => {
      // had trouble with conversationsSettingsBulkActions not updating fast enough
      // from the setConversationsSettingsBulkActions in saveSystemPromptSettings
      const bulkUpdates = bulkActions ?? conversationsSettingsBulkActions;
      const hasBulkConversations = bulkUpdates.create || bulkUpdates.update || bulkUpdates.delete;
      const bulkResult = hasBulkConversations
        ? await bulkUpdateConversations(http, bulkUpdates, toasts)
        : undefined;
      const didUpdateAssistantStreamingEnabled =
        assistantStreamingEnabled !== updatedAssistantStreamingEnabled;

      setAssistantStreamingEnabled(updatedAssistantStreamingEnabled);

      if (didUpdateAssistantStreamingEnabled) {
        assistantTelemetry?.reportAssistantSettingToggled({
          assistantStreamingEnabled: updatedAssistantStreamingEnabled,
        });
      }
      setConversationsSettingsBulkActions({});
      return bulkResult?.success ?? didUpdateAssistantStreamingEnabled ?? false;
    },
    [
      http,
      toasts,
      conversationsSettingsBulkActions,
      assistantStreamingEnabled,
      updatedAssistantStreamingEnabled,
      setAssistantStreamingEnabled,
      assistantTelemetry,
    ]
  );

  useEffect(() => {
    // Update conversation settings when conversations are loaded
    if (conversationsLoaded && Object.keys(conversationSettings).length === 0) {
      setConversationSettings(conversations);
    }
  }, [conversationSettings, conversations, conversationsLoaded]);

  return {
    assistantStreamingEnabled: updatedAssistantStreamingEnabled,
    conversationSettings,
    conversationsSettingsBulkActions,
    onConversationDeleted,
    resetConversationsSettings,
    saveConversationsSettings,
    setUpdatedAssistantStreamingEnabled,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  };
};
