/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ConversationChangeHandler } from '../../../embeddable/types';
import { useConversation } from '../../hooks/use_conversation';
import { useConversationId } from './use_conversation_id';

interface ConversationChangeNotifierProps {
  onConversationChange?: ConversationChangeHandler;
  children: React.ReactNode;
}

/**
 * Notifies `onConversationChange` whenever the active conversation id changes,
 *
 * Must be rendered below `ConversationContext.Provider`, `QueryClientProvider`
 * and `SendMessageProvider` (required by `useConversation`).
 */
export const ConversationChangeNotifier: React.FC<ConversationChangeNotifierProps> = ({
  onConversationChange,
  children,
}) => {
  const conversationId = useConversationId();
  const { conversation, isError, isFetched } = useConversation();

  useEffect(() => {
    if (!onConversationChange) {
      return;
    }

    if (!conversationId) {
      onConversationChange({ id: undefined });
      return;
    }

    if (isError) {
      onConversationChange({ id: conversationId });
      return;
    }

    if (isFetched && conversation) {
      onConversationChange({ id: conversationId, attachments: conversation.attachments });
    }
  }, [conversationId, conversation, isError, isFetched, onConversationChange]);

  return <>{children}</>;
};
