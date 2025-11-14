/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { WorkplaceConnectorResponse, CreateWorkplaceConnectorRequest } from '../../common';

export interface UseConnectorsResult {
  connectors: WorkplaceConnectorResponse[];
  isLoading: boolean;
  error: string | null;
  createConnector: (
    request: CreateWorkplaceConnectorRequest
  ) => Promise<WorkplaceConnectorResponse>;
  deleteConnector: (id: string) => Promise<void>;
  deleteAllConnectors: () => Promise<void>;
  refreshConnectors: () => Promise<void>;
  isConnected: (connectorType: string) => boolean;
}

export function useConnectors(httpClient: any): UseConnectorsResult {
  const [connectors, setConnectors] = useState<WorkplaceConnectorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await httpClient.get('/api/workplace_connectors');
      setConnectors(response.connectors || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch connectors');
      setConnectors([]);
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const createConnector = useCallback(
    async (request: CreateWorkplaceConnectorRequest): Promise<WorkplaceConnectorResponse> => {
      setError(null);

      try {
        const response = await httpClient.post('/api/workplace_connectors', {
          body: JSON.stringify(request),
        });

        // Refresh the connectors list
        await fetchConnectors();

        return response;
      } catch (err) {
        const errorMessage = err.message || 'Failed to create connector';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [httpClient, fetchConnectors]
  );

  const deleteConnector = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await httpClient.delete(`/api/workplace_connectors/${id}`);
        await fetchConnectors();
      } catch (err) {
        const errorMessage = err.message || 'Failed to delete connector';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [httpClient, fetchConnectors]
  );

  const deleteAllConnectors = useCallback(
    async (): Promise<void> => {
      setError(null);
      try {
        await httpClient.delete('/api/workplace_connectors');
        await fetchConnectors();
      } catch (err) {
        const errorMessage = err.message || 'Failed to delete all connectors';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [httpClient, fetchConnectors]
  );

  const isConnected = useCallback(
    (connectorType: string): boolean => {
      return connectors.some((connector) => connector.type === connectorType);
    },
    [connectors]
  );

  return {
    connectors,
    isLoading,
    error,
    createConnector,
    deleteConnector,
    deleteAllConnectors,
    refreshConnectors: fetchConnectors,
    isConnected,
  };
}
