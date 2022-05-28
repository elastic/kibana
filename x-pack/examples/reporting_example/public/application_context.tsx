/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, createContext, FC } from 'react';

import type { MyForwardableState } from './types';

interface ContextValue {
  forwardedState?: MyForwardableState;
}

const ApplicationContext = createContext<undefined | ContextValue>(undefined);

export const ApplicationContextProvider: FC<{ forwardedState: ContextValue['forwardedState'] }> = ({
  forwardedState,
  children,
}) => {
  return (
    <ApplicationContext.Provider value={{ forwardedState }}>{children}</ApplicationContext.Provider>
  );
};

export const useApplicationContext = (): ContextValue => {
  const ctx = useContext(ApplicationContext);
  if (!ctx) {
    throw new Error('useApplicationContext called outside of ApplicationContext!');
  }
  return ctx;
};
