/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

interface EmbeddableModeContextValue {
  isEmbeddedMode: boolean;
  onConversationCreated?: (conversationId: string) => void;
}

const EmbeddableModeContext = createContext<EmbeddableModeContextValue>({
  isEmbeddedMode: false,
});

interface EmbeddableModeProviderProps {
  isEmbeddedMode: boolean;
  onConversationCreated?: (conversationId: string) => void;
  children: React.ReactNode;
}

export const EmbeddableModeProvider: React.FC<EmbeddableModeProviderProps> = ({
  isEmbeddedMode,
  onConversationCreated,
  children,
}) => {
  return (
    <EmbeddableModeContext.Provider value={{ isEmbeddedMode, onConversationCreated }}>
      {children}
    </EmbeddableModeContext.Provider>
  );
};

export const useEmbeddableMode = (): EmbeddableModeContextValue => {
  return useContext(EmbeddableModeContext);
};

