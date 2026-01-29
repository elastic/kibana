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

export function useInsightsApi(connectorId?: string) {
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
      /* Onboarding */

      scheduleOnboardingTask: async (streamName: string) => {
        const { from, to } = getLast24HoursTimeRange();

        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_task',
          {
            signal,
            params: {
              path: { streamName },
              body: {
                action: 'schedule',
                from,
                to,
                connectorId,
              },
            },
          }
        );
      },
      getOnboardingTaskStatus: async (streamName: string) => {
        return streamsRepositoryClient.fetch(
          'GET /internal/streams/{streamName}/onboarding/_status',
          {
            signal,
            params: {
              path: { streamName },
            },
          }
        );
      },
      cancelOnboardingTask: async (streamName: string) => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_task',
          {
            signal,
            params: {
              path: { streamName },
              body: {
                action: 'cancel',
              },
            },
          }
        );
      },

      /* Insights Discovery */

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
