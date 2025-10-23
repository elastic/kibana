/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

interface ConversationContextValue {
  conversationId?: string;
  shouldStickToBottom?: boolean;
}

const ConversationContext = createContext<ConversationContextValue>({});

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  return context;
};

export { ConversationContext };
