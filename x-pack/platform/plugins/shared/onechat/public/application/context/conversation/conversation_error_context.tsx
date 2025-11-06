/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/onechat-common';
import produce from 'immer';
import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useState } from 'react';
import { newConversationId } from '../../utils/new_conversation';

export interface ConversationError {
  error: unknown;
  erroredRound: ConversationRound;
}

/** Mapping between conversation id and conversation error */
type ConversationErrors = Record<string, ConversationError>;

interface ConversationErrorContextValue {
  conversationError: ConversationError | undefined;
  setError: (conversationError: ConversationError) => void;
  removeError: () => void;
}

export const ConversationErrorContext = createContext<ConversationErrorContextValue | undefined>(
  undefined
);

export const ConversationErrorProvider: React.FC<
  PropsWithChildren<{ conversationId?: string }>
> = ({ conversationId = newConversationId, children }) => {
  const [conversationErrors, setConversationErrors] = useState<ConversationErrors>({});
  const conversationError: ConversationError | undefined = conversationErrors[conversationId];
  const setError = (nextError: ConversationError) => {
    setConversationErrors(
      produce((draft) => {
        draft[conversationId] = nextError;
      })
    );
  };
  const removeError = () => {
    setConversationErrors(
      produce((draft) => {
        delete draft[conversationId];
      })
    );
  };
  return (
    <ConversationErrorContext.Provider value={{ conversationError, setError, removeError }}>
      {children}
    </ConversationErrorContext.Provider>
  );
};

export const useConversationError = () => {
  const context = useContext(ConversationErrorContext);
  if (!context) {
    throw new Error('useConversationError must be used within a ConversationErrorProvider');
  }
  return context;
};
