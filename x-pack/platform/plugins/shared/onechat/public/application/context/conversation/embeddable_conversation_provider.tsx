/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationContext } from './conversation_context';

interface EmbeddableConversationProviderProps {
  conversationId?: string;
  shouldStickToBottom?: boolean;
  children: React.ReactNode;
}

export const EmbeddableConversationProvider: React.FC<EmbeddableConversationProviderProps> = ({
  conversationId,
  shouldStickToBottom = true,
  children,
}) => {
  return (
    <ConversationContext.Provider value={{ conversationId, shouldStickToBottom }}>
      {children}
    </ConversationContext.Provider>
  );
};
