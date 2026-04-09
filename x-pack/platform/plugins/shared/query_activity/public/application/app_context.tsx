/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, type PropsWithChildren } from 'react';
import type {
  Capabilities,
  ChromeStart,
  DocLinksStart,
  HttpSetup,
  NotificationsStart,
} from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { QueryActivityApiService } from '../lib/api';

export interface QueryActivityCapabilities {
  canCancelTasks: boolean;
  canViewTasks: boolean;
  isLoading: boolean;
  missingClusterPrivileges: string[];
}

export interface QueryActivityAppContextValue {
  chrome: ChromeStart;
  http: HttpSetup;
  notifications: NotificationsStart;
  apiService: QueryActivityApiService;
  url: SharePluginStart['url'];
  docLinks: DocLinksStart;
  capabilities: QueryActivityCapabilities;
}

const QueryActivityAppContext = React.createContext<QueryActivityAppContextValue | undefined>(
  undefined
);

export const QueryActivityAppContextProvider: React.FC<
  PropsWithChildren<
    Omit<QueryActivityAppContextValue, 'capabilities'> & { kibanaCapabilities: Capabilities }
  >
> = ({ children, kibanaCapabilities, ...contextValue }) => {
  const { data, isLoading } = contextValue.apiService.useLoadPrivileges();

  const capabilities = useMemo<QueryActivityCapabilities>(
    () => ({
      canCancelTasks:
        Boolean(data?.canCancelTasks) && kibanaCapabilities.queryActivity?.save !== false,
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
    <QueryActivityAppContext.Provider value={{ ...contextValue, capabilities }}>
      {children}
    </QueryActivityAppContext.Provider>
  );
};

export const useQueryActivityAppContext = (): QueryActivityAppContextValue => {
  const context = useContext(QueryActivityAppContext);
  if (!context) {
    throw new Error(
      'useQueryActivityAppContext must be used within a QueryActivityAppContextProvider'
    );
  }
  return context;
};
