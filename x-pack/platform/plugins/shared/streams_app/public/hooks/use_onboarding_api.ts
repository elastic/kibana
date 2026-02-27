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

export interface UseOnboardingApiOptions {
  connectorId?: string;
  saveQueries?: boolean;
}

export function useOnboardingApi({ connectorId, saveQueries = true }: UseOnboardingApiOptions) {
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
      scheduleOnboardingTask: async (streamName: string) => {
        const { from, to } = getLast24HoursTimeRange();

        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_task',
          {
            signal,
            params: {
              path: { streamName },
              query: { saveQueries },
              body: {
                action: 'schedule' as const,
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
              query: { saveQueries },
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
              query: { saveQueries },
              body: {
                action: 'cancel' as const,
              },
            },
          }
        );
      },
      acknowledgeOnboardingTask: async (streamName: string) => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_task',
          {
            signal,
            params: {
              path: { streamName },
              query: { saveQueries },
              body: {
                action: 'acknowledge' as const,
              },
            },
          }
        );
      },
    }),
    [connectorId, saveQueries, signal, streamsRepositoryClient]
  );
}
