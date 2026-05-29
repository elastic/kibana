/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';

export interface SingleStepConnector {
  id: string;
  name: string;
  connectorTypeId: string;
  isMissingSecrets: boolean;
  isDeprecated: boolean;
}

interface RawConnectorResponse {
  id: string;
  name: string;
  connector_type_id: string;
  is_missing_secrets?: boolean;
  is_deprecated?: boolean;
}

const CONNECTORS_API_PATH = '/api/actions/connectors';
// All connector types share one cache entry: we fetch the full list once and filter client-side
// in useMemo. Every caller must use the same `isEnabled` value; diverging values between
// concurrent instances can cause a disabled caller to receive cached data from an enabled one.
export const ALL_CONNECTORS_KEY = ['alertingV2', 'singleStepWorkflow', 'connectors'] as const;

const toSingleStepConnector = (c: RawConnectorResponse): SingleStepConnector => ({
  id: c.id,
  name: c.name,
  connectorTypeId: c.connector_type_id,
  isMissingSecrets: c.is_missing_secrets ?? false,
  isDeprecated: c.is_deprecated ?? false,
});

export const useFetchConnectorsByType = ({
  connectorTypeId,
  isEnabled = true,
}: {
  connectorTypeId: string | null;
  isEnabled?: boolean;
}) => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  const query = useQuery<SingleStepConnector[], Error>({
    queryKey: ALL_CONNECTORS_KEY,
    queryFn: async () => {
      const all = await http.get<RawConnectorResponse[]>(CONNECTORS_API_PATH);
      return all.map(toSingleStepConnector);
    },
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.singleStepWorkflow.connectors.fetchError', {
          defaultMessage: 'Failed to load connectors',
        }),
      });
    },
  });

  const filtered = useMemo(
    () =>
      connectorTypeId
        ? (query.data ?? []).filter((c) => c.connectorTypeId === connectorTypeId)
        : query.data ?? [],
    [query.data, connectorTypeId]
  );

  return { ...query, data: filtered };
};
