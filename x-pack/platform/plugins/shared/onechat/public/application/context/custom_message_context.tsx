/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useRef } from 'react';

interface CustomMessageContextType {
  customMessage: string | undefined;
  consumeCustomMessage: () => string | undefined;
}

export const CustomMessageContext = createContext<CustomMessageContextType | null>(null);

export const CustomMessageProvider: React.FC<
  React.PropsWithChildren<{ customMessage?: string }>
> = ({ children, customMessage: initialCustomMessage }) => {
  // Use a ref to store the custom message so it can be consumed once
  const customMessageRef = useRef<string | undefined>(initialCustomMessage);

  const consumeCustomMessage = () => {
    const message = customMessageRef.current;
    customMessageRef.current = undefined; // Clear after consumption
    return message;
  };

  const contextValue = {
    customMessage: customMessageRef.current,
    consumeCustomMessage,
  };

  return (
    <CustomMessageContext.Provider value={contextValue}>
      {children}
    </CustomMessageContext.Provider>
  );
};

export const useCustomMessage = () => {
  const context = useContext(CustomMessageContext);
  if (!context) {
    // Return a no-op implementation if provider is not available
    return {
      customMessage: undefined,
      consumeCustomMessage: () => undefined,
    };
  }
  return context;
};

