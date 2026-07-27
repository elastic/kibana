/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

// Action connector type ids for the data-retrieval connectors that can back an
// AI index source. These are spec-based stack connectors that fetch data on
// demand when a tool is called (e.g. list files, read a document), rather than
// indexing data into Elasticsearch.
export const DATA_CONNECTOR_TYPE_IDS = [
  '.google_drive',
  '.one_drive',
  '.notion',
  '.amazon_s3',
  '.github',
  '.box',
  '.dropbox',
  '.google_cloud_storage',
  '.salesforce',
  '.zendesk',
] as const;

const DATA_CONNECTOR_TYPE_ID_SET: ReadonlySet<string> = new Set(DATA_CONNECTOR_TYPE_IDS);

// Public route backing the Stack Management connectors page
// (/app/management/insightsAndAlerting/triggersActionsConnectors/connectors).
const ACTION_CONNECTORS_LIST_PATH = '/api/actions/connectors';

interface RawActionConnector {
  id: string;
  name: string;
  connector_type_id: string;
}

export interface DataConnector {
  id: string;
  name: string;
}

/**
 * Lists the space's action connectors, filtered to the data-retrieval subset
 * that can be used as AI index sources.
 */
export const useDataConnectors = () => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: contextEngineQueryKeys.connectors.list(),
    queryFn: () => http.get<RawActionConnector[]>(ACTION_CONNECTORS_LIST_PATH),
    refetchOnWindowFocus: false,
  });

  const connectors = useMemo<DataConnector[]>(
    () =>
      (data ?? [])
        .filter((connector) => DATA_CONNECTOR_TYPE_ID_SET.has(connector.connector_type_id))
        .map((connector) => ({ id: connector.id, name: connector.name || connector.id })),
    [data]
  );

  const connectorNameById = useMemo(
    () => new Map(connectors.map((connector) => [connector.id, connector.name])),
    [connectors]
  );

  return { connectors, connectorNameById, isLoading };
};
