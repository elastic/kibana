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
import type { CollectionStateRef } from '../sections/epm/screens/home/card_utils';

interface IntegrationsStateContextValue {
  getFromIntegrations(): string | undefined;
  getFromCollection(): CollectionStateRef | undefined;
}

const IntegrationsStateContext = createContext<IntegrationsStateContextValue>({
  getFromIntegrations: () => undefined,
  getFromCollection: () => undefined,
});

export const IntegrationsStateContextProvider: FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const maybeState = useIntraAppState<
    undefined | (IntegrationsAppBrowseRouteState & { fromCollection?: CollectionStateRef })
  >();
  const fromIntegrationsRef = useRef<undefined | string>(maybeState?.fromIntegrations);
  const fromCollectionRef = useRef<CollectionStateRef | undefined>(maybeState?.fromCollection);

  const getFromIntegrations = useCallback(() => {
    return fromIntegrationsRef.current;
  }, []);

  const getFromCollection = useCallback(() => {
    return fromCollectionRef.current;
  }, []);

  return (
    <IntegrationsStateContext.Provider value={{ getFromIntegrations, getFromCollection }}>
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
