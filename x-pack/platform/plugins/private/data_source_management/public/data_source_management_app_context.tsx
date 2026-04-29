/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { SampleDataSetsClient } from '../common/sample_data_sets_client';
import { SampleDataSourcesClient } from '../common/sample_data_sources_client';

export interface DataSourceManagementAppContextValue {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  dataSourcesClient: SampleDataSourcesClient;
  dataSetsClient: SampleDataSetsClient;
}

const DataSourceManagementAppContext = createContext<DataSourceManagementAppContextValue | null>(
  null
);

export const DataSourceManagementAppContextProvider: FunctionComponent<{
  coreStart: CoreStart;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  children: ReactNode;
}> = ({ coreStart, setBreadcrumbs, children }) => {
  const value = useMemo<DataSourceManagementAppContextValue>(() => {
    return {
      coreStart,
      setBreadcrumbs,
      dataSourcesClient: new SampleDataSourcesClient(),
      dataSetsClient: new SampleDataSetsClient(),
    };
  }, [coreStart, setBreadcrumbs]);

  return (
    <DataSourceManagementAppContext.Provider value={value}>
      {children}
    </DataSourceManagementAppContext.Provider>
  );
};

export function useDataSourceManagementAppContext(): DataSourceManagementAppContextValue {
  const ctx = useContext(DataSourceManagementAppContext);
  if (!ctx) {
    throw new Error('useDataSourceManagementAppContext must be used within its provider');
  }
  return ctx;
}
