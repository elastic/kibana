/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface AdditionalContextState {
  additionalContext: string | undefined;
  consumeAdditionalContext: () => string | undefined;
}

const AdditionalContextContext = createContext<AdditionalContextState | null>(null);

export const AdditionalContextProvider: React.FC<
  React.PropsWithChildren<{ additionalContext?: string }>
> = ({ children, additionalContext: initialContext }) => {
  const [additionalContext, setAdditionalContext] = useState<string | undefined>(initialContext);

  const consumeAdditionalContext = useCallback(() => {
    const context = additionalContext;
    setAdditionalContext(undefined); // Clear after consumption
    return context;
  }, [additionalContext]);

  const value = useMemo(
    () => ({
      additionalContext,
      consumeAdditionalContext,
    }),
    [additionalContext, consumeAdditionalContext]
  );

  return (
    <AdditionalContextContext.Provider value={value}>
      {children}
    </AdditionalContextContext.Provider>
  );
};

export const useAdditionalContext = () => {
  const context = useContext(AdditionalContextContext);
  if (!context) {
    // Return a no-op implementation if provider is not available (standalone app mode)
    return {
      additionalContext: undefined,
      consumeAdditionalContext: () => undefined,
    };
  }
  return context;
};

