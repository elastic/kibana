/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_ACTION_API_PATH, ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  GetAllConnectorsResponse,
  GetAllConnectorTypesResponseV1 as GetAllConnectorTypesResponse,
} from '@kbn/actions-plugin/common/routes/connector/response';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

export interface DataConnector {
  id: string;
  name: string;
  actionTypeId: string;
}

export interface UseDataConnectorsOptions {
  enabled?: boolean;
}

export interface UseDataConnectorsResult {
  connectors: DataConnector[];
  connectorNameById: Map<string, string>;
  connectorActionTypeById: Map<string, string>;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
}

/**
 * Lists the connectors whose type declares the `contextEngine` feature id.
 */
export const useDataConnectors = ({
  enabled = true,
}: UseDataConnectorsOptions = {}): UseDataConnectorsResult => {
  const {
    services: { http },
  } = useKibana();

  const {
    data: types,
    isLoading: isTypesLoading,
    isError: isTypesError,
    error: typesError,
  } = useQuery<GetAllConnectorTypesResponse, Error>({
    queryKey: contextEngineQueryKeys.connectors.types(),
    queryFn: ({ signal }) =>
      http.get<GetAllConnectorTypesResponse>(`${BASE_ACTION_API_PATH}/connector_types`, {
        query: { feature_id: ContextEngineConnectorFeatureId },
        signal,
      }),
    refetchOnWindowFocus: false,
    enabled,
  });

  const supportedTypeIds = useMemo(() => new Set((types ?? []).map((type) => type.id)), [types]);

  const {
    data: connectorsResponse,
    isLoading: isConnectorsLoading,
    isError: isConnectorsError,
    error: connectorsError,
  } = useQuery<GetAllConnectorsResponse, Error>({
    queryKey: contextEngineQueryKeys.connectors.list(),
    queryFn: ({ signal }) =>
      http.get<GetAllConnectorsResponse>(`${BASE_ACTION_API_PATH}/connectors`, { signal }),
    refetchOnWindowFocus: false,
    enabled,
  });

  const connectors = useMemo<DataConnector[]>(
    () =>
      (connectorsResponse ?? [])
        .filter((connector) => supportedTypeIds.has(connector.connector_type_id))
        .map((connector) => ({
          id: connector.id,
          name: connector.name || connector.id,
          actionTypeId: connector.connector_type_id,
        })),
    [connectorsResponse, supportedTypeIds]
  );

  const connectorNameById = useMemo(
    () => new Map(connectors.map((connector) => [connector.id, connector.name])),
    [connectors]
  );

  const connectorActionTypeById = useMemo(
    () => new Map(connectors.map((connector) => [connector.id, connector.actionTypeId])),
    [connectors]
  );

  const isLoading = enabled && (isTypesLoading || isConnectorsLoading);
  const isError = enabled && (isTypesError || isConnectorsError);
  const error = enabled ? typesError ?? connectorsError ?? undefined : undefined;

  return {
    connectors,
    connectorNameById,
    connectorActionTypeById,
    isLoading,
    isError,
    error,
  };
};
