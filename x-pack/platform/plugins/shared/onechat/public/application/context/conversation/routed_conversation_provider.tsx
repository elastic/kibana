/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSyncAgentId } from '../../hooks/use_sync_agent_id';
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { newConversationId } from '../../utils/new_conversation';

interface RoutedConversationProviderProps {
  children: React.ReactNode;
}

export const RoutedConversationProvider: React.FC<RoutedConversationProviderProps> = ({
  children,
}) => {
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();

  const conversationId = useMemo(() => {
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;

  // Handle agent ID syncing from URL params (full-screen only)
  useSyncAgentId();

  return (
    <ConversationContext.Provider value={{ conversationId, shouldStickToBottom }}>
      {children}
    </ConversationContext.Provider>
  );
};
