/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, type PropsWithChildren } from 'react';
import type { Capabilities, ChromeStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { RunningQueriesApiService } from '../lib/api';

export interface RunningQueriesCapabilities {
  canCancelTasks: boolean;
  canViewTasks: boolean;
  isLoading: boolean;
  missingClusterPrivileges: string[];
}

export interface RunningQueriesAppContextValue {
  chrome: ChromeStart;
  http: HttpSetup;
  notifications: NotificationsStart;
  apiService: RunningQueriesApiService;
  url: SharePluginStart['url'];
  capabilities: RunningQueriesCapabilities;
}

const RunningQueriesAppContext = React.createContext<RunningQueriesAppContextValue | undefined>(
  undefined
);

export const RunningQueriesAppContextProvider: React.FC<
  PropsWithChildren<
    Omit<RunningQueriesAppContextValue, 'capabilities'> & { kibanaCapabilities: Capabilities }
  >
> = ({ children, kibanaCapabilities, ...contextValue }) => {
  const { data, isLoading } = contextValue.apiService.useLoadPrivileges();

  const capabilities = useMemo<RunningQueriesCapabilities>(
    () => ({
      canCancelTasks:
        Boolean(data?.canCancelTasks) && kibanaCapabilities.running_queries?.save !== false,
      canViewTasks: Boolean(data?.canViewTasks),
      isLoading,
      missingClusterPrivileges: data?.missingClusterPrivileges ?? [],
    }),
    [
      data?.canCancelTasks,
      data?.canViewTasks,
      data?.missingClusterPrivileges,
      isLoading,
      kibanaCapabilities,
    ]
  );

  return (
    <RunningQueriesAppContext.Provider value={{ ...contextValue, capabilities }}>
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
