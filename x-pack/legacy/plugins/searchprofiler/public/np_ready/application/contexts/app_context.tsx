/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';
import { HttpSetup, ToastsSetup } from 'kibana/public';

export interface ContextValue {
  http: HttpSetup;
  notifications: ToastsSetup;
  licenseEnabled: boolean;
  formatAngularHttpError: (error: any) => string;
}

const AppContext = createContext<ContextValue>(null as any);

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
  if (ctx == null) {
    throw new Error(`useAppContext must be called inside AppContextProvider`);
  }
  return ctx;
};
