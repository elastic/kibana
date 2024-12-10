/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { createContext, useContext, useRef, useCallback } from 'react';

import type { IntegrationsAppBrowseRouteState } from '../../../types';
import { useIntraAppState } from '../../../hooks';

interface IntegrationsStateContextValue {
  getFromIntegrations(): string | undefined;
  pkgkey?: string;
  panel?: string;
}

const IntegrationsStateContext = createContext<IntegrationsStateContextValue>({
  getFromIntegrations: () => undefined,
});

export const IntegrationsStateContextProvider: FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const maybeState = useIntraAppState<undefined | IntegrationsAppBrowseRouteState>();
  const stateRef = useRef(maybeState);
  const getFromIntegrations = useCallback(() => {
    return stateRef.current?.fromIntegrations;
  }, []);
  return (
    <IntegrationsStateContext.Provider
      value={{
        getFromIntegrations,
        pkgkey: maybeState?.pkgkey,
      }}
    >
      {children}
    </IntegrationsStateContext.Provider>
  );
};

export const useIntegrationsStateContext = () => {
  const ctx = useContext(IntegrationsStateContext);
  if (!ctx) {
    throw new Error(
      'useIntegrationsStateContext can only be used inside of IntegrationsStateContextProvider'
    );
  }
  return ctx;
};
