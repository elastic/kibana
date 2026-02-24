/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, type PropsWithChildren } from 'react';
import type { ChromeStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { RunningQueriesApiService } from '../lib/api';

export interface RunningQueriesAppContextValue {
  chrome: ChromeStart;
  http: HttpSetup;
  notifications: NotificationsStart;
  apiService: RunningQueriesApiService;
  url: SharePluginStart['url'];
}

const RunningQueriesAppContext = React.createContext<RunningQueriesAppContextValue | undefined>(
  undefined
);

export const RunningQueriesAppContextProvider: React.FC<
  PropsWithChildren<RunningQueriesAppContextValue>
> = ({ children, ...contextValue }) => {
  return (
    <RunningQueriesAppContext.Provider value={contextValue}>
      {children}
    </RunningQueriesAppContext.Provider>
  );
};

export const useRunningQueriesAppContext = (): RunningQueriesAppContextValue => {
  const context = useContext(RunningQueriesAppContext);
  if (!context) {
    throw new Error(
      'useRunningQueriesAppContext must be used within a RunningQueriesAppContextProvider'
    );
  }
  return context;
};
