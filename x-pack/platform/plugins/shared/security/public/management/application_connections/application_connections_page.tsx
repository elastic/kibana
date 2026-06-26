/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { HttpStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { ApplicationConnections } from './application_connections_table/application_connections';
import { ApplicationConnectionsProvider } from './context/application_connections_provider';
import { ApplicationConnectionsServicesContext } from './context/application_connections_services_context';
import { ApplicationConnectionsAPIClient } from './service/application_connections_api_client';

export interface ApplicationConnectionsPageProps {
  http: HttpStart;
}

export const ApplicationConnectionsPage = ({ http }: ApplicationConnectionsPageProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  const services = useMemo(
    () => ({ apiClient: new ApplicationConnectionsAPIClient(http) }),
    [http]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApplicationConnectionsServicesContext.Provider value={services}>
        <ApplicationConnectionsProvider>
          <ApplicationConnections />
        </ApplicationConnectionsProvider>
      </ApplicationConnectionsServicesContext.Provider>
    </QueryClientProvider>
  );
};
