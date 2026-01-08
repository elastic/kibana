/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin';
import type { Connector } from '../../types/connector';
import { DataConnectorTypesService } from '../../services';
import { useKibana } from './use_kibana';

/**
 * Transforms a data source type from the registry to our internal Connector type
 */
const transformDataSourceType = (dataTypeDefinition: DataTypeDefinition): Connector => {
  return {
    id: dataTypeDefinition.id,
    name: dataTypeDefinition.name,
    type: dataTypeDefinition.stackConnector?.type, // Already has '.' prefix (e.g., '.notion')
    category: 'popular',
  };
};

/**
 * Hook to fetch and manage connectors from the Data Sources Registry.
 *
 * All connectors are fetched from Data Sources Registry via /api/data_connectors/types
 */
export const useConnectors = () => {
  const {
    services: { http },
  } = useKibana();

  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConnectorTypes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const service = new DataConnectorTypesService({ http });
        const connectorTypes = await service.list();

        // Transform connector types to our internal Connector interface
        const transformedConnectors = connectorTypes.map(transformDataSourceType);
        setConnectors(transformedConnectors);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch connector types'));
        // eslint-disable-next-line no-console
        console.error('Error fetching connector types:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectorTypes();
  }, [http]);

  return {
    connectors,
    isLoading,
    error,
  };
};
