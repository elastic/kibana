/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { AppDeps } from './app';

const AppContext = createContext<AppDeps>(null as any);

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDeps;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppDependencies = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error(
      'The app dependencies Context has not been set. Use the "setAppDependencies()" method when bootstrapping the app.'
    );
  }
  return ctx;
};
