/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin';
import { DUMMY_CONNECTORS } from '../../data/dummy_connectors';
import type { Connector } from '../../types/connector';
import { getConnectorIcon } from '../../utils';
import { DataConnectorTypesService } from '../../services';
import { useKibana } from './use_kibana';

/**
 * Transforms a data source type from the registry to our internal Connector type
 */
const transformDataSourceType = (dataTypeDefinition: DataTypeDefinition): Connector => {
  return {
    id: dataTypeDefinition.id,
    name: dataTypeDefinition.name,
    type: dataTypeDefinition.stackConnector?.type,
    icon: getConnectorIcon(dataTypeDefinition.name, dataTypeDefinition.id),
    category: 'popular',
  };
};

/**
 * Hook to fetch and manage connectors from the Data Sources Registry and dummy data.
 *
 * - "Popular" connectors: Fetched from Data Sources Registry via /api/data_connectors/types
 * - "All" connectors: Currently dummy data (TODO: replace with proper API)
 */
export const useConnectors = () => {
  const {
    services: { http },
  } = useKibana();

  const [popularConnectors, setPopularConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch popular connectors from Data Sources Registry via our plugin's routes
  useEffect(() => {
    const fetchConnectorTypes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const service = new DataConnectorTypesService({ http });
        const connectorTypes = await service.list();

        // Transform connector types to our internal Connector interface
        const connectors = connectorTypes.map(transformDataSourceType);
        setPopularConnectors(connectors);
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

  // All connectors come from dummy data for now
  // TODO: Replace with proper API when available
  const allConnectors = useMemo(() => DUMMY_CONNECTORS, []);

  // Combined list
  const connectors = useMemo(
    () => [...popularConnectors, ...allConnectors],
    [popularConnectors, allConnectors]
  );

  return {
    connectors,
    popularConnectors,
    allConnectors,
    isLoading,
    error,
  };
};
