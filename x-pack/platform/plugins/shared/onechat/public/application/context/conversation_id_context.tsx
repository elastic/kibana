/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ConversationIdContextValue {
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
}

const ConversationIdContext = createContext<ConversationIdContextValue | null>(null);

interface ConversationIdProviderProps {
  conversationId?: string;
  children: React.ReactNode;
}

export const ConversationIdProvider: React.FC<ConversationIdProviderProps> = ({
  conversationId: initialConversationId,
  children,
}) => {
  const [conversationId, setConversationIdState] = useState<string | undefined>(
    initialConversationId
  );

  const setConversationId = useCallback((id: string | undefined) => {
    setConversationIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      conversationId,
      setConversationId,
    }),
    [conversationId, setConversationId]
  );

  return <ConversationIdContext.Provider value={value}>{children}</ConversationIdContext.Provider>;
};

export const useConversationIdFromContext = (): ConversationIdContextValue | null => {
  return useContext(ConversationIdContext);
};

