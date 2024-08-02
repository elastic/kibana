/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { IToasts } from '@kbn/core/public';
import { Conversation } from '../../..';
import { SETTINGS_UPDATED_TOAST_TITLE } from './translations';

interface Props {
  conversationSettings: Record<string, Conversation>;
  defaultSelectedConversation: Conversation;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
  saveSettings: () => void;
  setHasPendingChanges: React.Dispatch<React.SetStateAction<boolean>>;
  toasts: IToasts | undefined;
}
export const useHandleSave = ({
  conversationSettings,
  defaultSelectedConversation,
  setSelectedConversationId,
  saveSettings,
  setHasPendingChanges,
  toasts,
}: Props) => {
  const handleSave = useCallback(() => {
    // If the selected conversation is deleted, we need to select a new conversation to prevent a crash creating a conversation that already exists
    const isSelectedConversationDeleted =
      conversationSettings[defaultSelectedConversation.title] == null;
    const newSelectedConversationId: string | undefined = Object.keys(conversationSettings)[0];
    if (isSelectedConversationDeleted && newSelectedConversationId != null) {
      setSelectedConversationId(conversationSettings[newSelectedConversationId].title);
    }
    saveSettings();
    toasts?.addSuccess({
      iconType: 'check',
      title: SETTINGS_UPDATED_TOAST_TITLE,
    });
    setHasPendingChanges(false);
  }, [
    conversationSettings,
    defaultSelectedConversation.title,
    saveSettings,
    setHasPendingChanges,
    setSelectedConversationId,
    toasts,
  ]);

  return handleSave;
};
