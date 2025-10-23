/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useConversationId } from '../hooks/use_conversation_id';
import { ConversationContext } from '../context/conversation_context';
import type { LocationState } from '../hooks/use_navigation';

interface RoutedConversationProviderProps {
  children: React.ReactNode;
}

export const RoutedConversationProvider: React.FC<RoutedConversationProviderProps> = ({
  children,
}) => {
  const conversationId = useConversationId();
  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;

  return (
    <ConversationContext.Provider value={{ conversationId, shouldStickToBottom }}>
      {children}
    </ConversationContext.Provider>
  );
};
