/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

interface FlyoutStateContextValue {
  isFlyoutOpen: boolean;
}

const FlyoutStateContext = createContext<FlyoutStateContextValue | undefined>(undefined);

interface FlyoutStateProviderProps {
  children: React.ReactNode;
  isFlyoutOpen: boolean;
}

export function ObservabilityAIAssistantFlyoutStateProvider({
  children,
  isFlyoutOpen,
}: FlyoutStateProviderProps) {
  return (
    <FlyoutStateContext.Provider value={{ isFlyoutOpen }}>{children}</FlyoutStateContext.Provider>
  );
}

export function useObservabilityAIAssistantFlyoutStateContext(): FlyoutStateContextValue {
  const context = useContext(FlyoutStateContext);
  if (context === undefined) {
    // Return default value when not within provider
    return { isFlyoutOpen: false };
  }
  return context;
}
