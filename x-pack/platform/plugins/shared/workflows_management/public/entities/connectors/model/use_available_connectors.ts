/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis';
import { useQuery } from '@kbn/react-query';
import type { ConnectorInstance, ConnectorTypeInfo } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';
import { selectConnectors } from '../../workflows/store/workflow_detail/selectors';

export const useAvailableConnectors = () => useSelector(selectConnectors);

/**
 * Helper hook to get connector instances for a specific action type
 */
export function useConnectorInstances(actionTypeId: string): ConnectorInstance[] {
  const data = useAvailableConnectors();
  return useMemo(
    () => data?.connectorTypes[actionTypeId]?.instances || [],
    [data?.connectorTypes, actionTypeId]
  );
}

/**
 * Helper hook to get all available connector types (for schema generation)
 */
export function useConnectorTypes(): ConnectorTypeInfo[] {
  const data = useAvailableConnectors();
  return useMemo(() => Object.values(data?.connectorTypes ?? {}), [data?.connectorTypes]);
}

/**
 * Helper hook to fetch a connector by its ID
 */
export function useFetchConnector(connectorId?: string) {
  const { http } = useKibana().services;
  return useQuery({
    queryKey: ['fetchConnector', connectorId],
    queryFn: () => (connectorId ? fetchConnector(connectorId, { http }) : undefined),
    enabled: !!connectorId,
    cacheTime: 0,
  });
}
