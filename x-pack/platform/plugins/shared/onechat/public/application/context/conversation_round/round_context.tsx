/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/onechat-common';
import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

interface RoundContextValue {
  round: ConversationRound;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

const RoundContext = createContext<RoundContextValue | null>(null);

export const useRoundContext = () => {
  const context = useContext(RoundContext);
  if (!context) {
    throw new Error('useRoundContext must be called inside RoundContextProvider');
  }
  return context;
};

export const RoundContextProvider: React.FC<PropsWithChildren<RoundContextValue>> = ({
  round,
  isLoading,
  isError,
  error,
  children,
}) => {
  return (
    <RoundContext.Provider value={{ round, isLoading, isError, error }}>
      {children}
    </RoundContext.Provider>
  );
};
