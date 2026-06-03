/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from '../use_kibana';

export const useSignificantEventsDiscoveryApi = () => {
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
      triggerSignificantEventsDiscovery: () =>
        streamsRepositoryClient.fetch(
          'POST /internal/streams/significant_events/discovery/_execute',
          {
            params: { body: { action: 'trigger' as const } },
            signal,
          }
        ),
      cancelSignificantEventsDiscovery: () =>
        streamsRepositoryClient.fetch(
          'POST /internal/streams/significant_events/discovery/_execute',
          {
            params: { body: { action: 'cancel' as const } },
            signal,
          }
        ),
      getSignificantEventsDiscoveryStatus: () =>
        streamsRepositoryClient.fetch(
          'GET /internal/streams/significant_events/discovery/_status',
          { params: {}, signal }
        ),
    }),
    [signal, streamsRepositoryClient]
  );
};
