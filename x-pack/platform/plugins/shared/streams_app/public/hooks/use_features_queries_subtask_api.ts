/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

export function useFeaturesQueriesSubtaskApi() {
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
      scheduleFeaturesIdentificationTask: async (streamName: string) => {
        const { from, to } = getLast24HoursTimeRange();
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/features/_task', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'schedule' as const,
              from,
              to,
            },
          },
        });
      },
      getFeaturesIdentificationStatus: async (streamName: string) => {
        return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features/_status', {
          signal,
          params: {
            path: { name: streamName },
          },
        });
      },
      scheduleQueriesGenerationTask: async (streamName: string) => {
        const { from, to } = getLast24HoursTimeRange();
        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/significant_events/_task',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                action: 'schedule' as const,
                from,
                to,
              },
            },
          }
        );
      },
      getQueriesGenerationStatus: async (streamName: string) => {
        return streamsRepositoryClient.fetch(
          'GET /internal/streams/{name}/significant_events/_status',
          {
            signal,
            params: {
              path: { name: streamName },
            },
          }
        );
      },
    }),
    [signal, streamsRepositoryClient]
  );
}
