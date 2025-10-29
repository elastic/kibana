/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { ConversationActions } from './use_conversation_actions';

interface ConversationContextValue {
  conversationId?: string;
  shouldStickToBottom?: boolean;
  isEmbeddedContext: boolean;
  sessionTag?: string;
  agentId?: string;
  initialMessage?: string;
  setConversationId?: (conversationId: string) => void;
  conversationActions: ConversationActions;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationContext.Provider');
  }
  return context;
};

export { ConversationContext };
