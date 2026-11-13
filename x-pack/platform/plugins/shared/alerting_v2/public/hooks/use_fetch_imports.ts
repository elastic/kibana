/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { importKeys } from './query_key_factory';

const CONNECTORS_API_PATH = '/api/actions/connectors';

/** The fields of `GET /api/actions/connectors` that the imports list reads. */
interface ConnectorResponse {
  id: string;
  name: string;
  connector_type_id: string;
  is_inbound_events_enabled?: boolean;
}

export interface ImportListItem {
  connectorId: string;
  name: string;
  connectorTypeId: string;
}

/**
 * Returns the connectors that receive inbound events in the current space. The connectors API
 * cannot filter, so every connector is fetched and filtered here.
 */
export const fetchImports = async (http: HttpStart): Promise<ImportListItem[]> => {
  const connectors = await http.get<ConnectorResponse[]>(CONNECTORS_API_PATH);
  return connectors
    .filter(
      ({ is_inbound_events_enabled: isInboundEventsEnabled }) => isInboundEventsEnabled === true
    )
    .map(({ id, name, connector_type_id: connectorTypeId }) => ({
      connectorId: id,
      name,
      connectorTypeId,
    }));
};

/** Loads the imports of the current space: its connectors with inbound events turned on. */
export const useFetchImports = () => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<ImportListItem[], Error>({
    queryKey: importKeys.list(),
    queryFn: () => fetchImports(http),
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.imports.list.fetchError', {
          defaultMessage: 'Failed to load imports',
        }),
      });
    },
  });
};
