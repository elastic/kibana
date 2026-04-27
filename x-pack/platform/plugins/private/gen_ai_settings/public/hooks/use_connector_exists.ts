/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { NO_DEFAULT_CONNECTOR } from '../../common/constants';
import { useKibana } from './use_kibana';

/**
 * Checks whether a given connector ID actually exists by fetching it directly
 * from the inference plugin. This avoids false negatives from the deduped
 * connector list returned by getConnectorList.
 */
export function useConnectorExists(connectorId: string): {
  exists: boolean;
  loading: boolean;
} {
  const {
    services: { genAiSettingsApi },
  } = useKibana();

  const enabled = Boolean(connectorId) && connectorId !== NO_DEFAULT_CONNECTOR;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['connectorExists', connectorId],
    enabled,
    queryFn: async ({ signal }) => {
      await genAiSettingsApi('GET /internal/gen_ai_settings/connectors/{connectorId}', {
        signal,
        params: { path: { connectorId } },
      });
      return true;
    },
    retry: false,
  });

  if (!enabled) {
    return { exists: true, loading: false };
  }

  return { exists: isError ? false : data ?? true, loading: isLoading };
}
