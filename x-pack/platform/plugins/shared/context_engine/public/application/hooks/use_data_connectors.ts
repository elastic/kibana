/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import type { GetAllConnectorsResponse } from '@kbn/actions-plugin/common/routes/connector/response';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { isDataConnectorType } from '../../../common/data_connectors';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

export interface DataConnector {
  id: string;
  name: string;
}

export interface UseDataConnectorsOptions {
  enabled?: boolean;
}

export interface UseDataConnectorsResult {
  connectors: DataConnector[];
  connectorNameById: Map<string, string>;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
}

/**
 * Lists connectors filtered by a specific subset of data connector.
 */
export const useDataConnectors = ({
  enabled = true,
}: UseDataConnectorsOptions = {}): UseDataConnectorsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, isError, error } = useQuery<GetAllConnectorsResponse, Error>({
    queryKey: contextEngineQueryKeys.connectors.list(),
    queryFn: ({ signal }) =>
      http.get<GetAllConnectorsResponse>(`${BASE_ACTION_API_PATH}/connectors`, { signal }),
    refetchOnWindowFocus: false,
    enabled,
  });

  const connectors = useMemo<DataConnector[]>(
    () =>
      (data ?? [])
        .filter((connector) => isDataConnectorType(connector.connector_type_id))
        .map((connector) => ({ id: connector.id, name: connector.name || connector.id })),
    [data]
  );

  const connectorNameById = useMemo(
    () => new Map(connectors.map((connector) => [connector.id, connector.name])),
    [connectors]
  );

  return {
    connectors,
    connectorNameById,
    isLoading: enabled && isLoading,
    isError: enabled && isError,
    error: enabled ? error ?? undefined : undefined,
  };
};
