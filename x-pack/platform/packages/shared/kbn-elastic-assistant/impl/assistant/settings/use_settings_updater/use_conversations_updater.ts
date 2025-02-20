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
  resetConversationsSettings: () => void;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  setUpdatedAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  saveConversationsSettings: () => Promise<boolean>;
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

  const hasBulkConversations =
    conversationsSettingsBulkActions.create ||
    conversationsSettingsBulkActions.update ||
    conversationsSettingsBulkActions.delete;

  /**
   * Save all pending settings
   */
  const saveConversationsSettings = useCallback(async (): Promise<boolean> => {
    const bulkResult = hasBulkConversations
      ? await bulkUpdateConversations(http, conversationsSettingsBulkActions, toasts)
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
    return bulkResult?.success ?? true;
  }, [
    http,
    toasts,
    hasBulkConversations,
    conversationsSettingsBulkActions,
    assistantStreamingEnabled,
    updatedAssistantStreamingEnabled,
    setAssistantStreamingEnabled,
    assistantTelemetry,
  ]);

  useEffect(() => {
    // Update conversa  tion settings when conversations are loaded
    if (conversationsLoaded && Object.keys(conversationSettings).length === 0) {
      setConversationSettings(conversations);
    }
  }, [conversationSettings, conversations, conversationsLoaded]);

  return {
    assistantStreamingEnabled: updatedAssistantStreamingEnabled,
    conversationSettings,
    conversationsSettingsBulkActions,
    resetConversationsSettings,
    saveConversationsSettings,
    setUpdatedAssistantStreamingEnabled,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  };
};
