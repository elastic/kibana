/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { useApplicationConnectionsService } from './use_application_connections_service';
import { queryKeys } from '../constants/query_keys';
import type { ListOAuthConnectionsResponse } from '../service/application_connections_api_client';

const selectConnections = (data: ListOAuthConnectionsResponse) => data.connections;

export const useConnections = () => {
  const apiClient = useApplicationConnectionsService();
  return useQuery({
    queryKey: queryKeys.applicationConnections.connections.all,
    queryFn: () => apiClient.listConnections(),
    select: selectConnections,
  });
};
