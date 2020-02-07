/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'src/core/public';
import React, { createContext, useContext } from 'react';

export interface ContextValue {
  http: HttpSetup;
  isCloudEnabled: boolean;
  XSRF: string;
}

export const AppContext = createContext<ContextValue>({} as any);

export const AppContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ContextValue;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be called from inside AppContext');
  }
  return ctx;
};
