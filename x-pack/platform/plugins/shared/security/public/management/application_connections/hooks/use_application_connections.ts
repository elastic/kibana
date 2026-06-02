/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { useMemo } from 'react';

import { useClients } from './use_clients';
import { useConnections } from './use_connections';
import type { ApplicationConnections } from '../constants/types';

const EMPTY_ROWS: ApplicationConnections[] = [];

export const useApplicationConnections = () => {
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: connections, isLoading: isLoadingConnections } = useConnections();

  const applicationConnections = useMemo<ApplicationConnections[]>(() => {
    if (!clients || !connections) return EMPTY_ROWS;

    const byClient = groupBy(connections, (connection) => connection.client_id);
    return clients
      .map((client) => ({ client, connections: byClient[client.id] ?? [] }))
      .filter((row) => row.connections.length > 0);
  }, [clients, connections]);

  return {
    applicationConnections,
    isLoading: isLoadingClients || isLoadingConnections,
  };
};
