/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

export function useInsightsDiscoveryApi(connectorId?: string) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      scheduleInsightsDiscoveryTask: async () => {
        await streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
          signal,
          params: {
            body: {
              action: 'schedule',
              connectorId,
            },
          },
        });
      },
      getInsightsDiscoveryTaskStatus: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_status', {
          signal,
        });
      },
      cancelInsightsDiscoveryTask: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
          signal,
          params: {
            body: {
              action: 'cancel' as const,
            },
          },
        });
      },
      acknowledgeInsightsDiscoveryTask: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
          signal,
          params: {
            body: {
              action: 'acknowledge' as const,
            },
          },
        });
      },
    }),
    [connectorId, signal, streamsRepositoryClient]
  );
}
