/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { OnboardingStep } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

export interface UseOnboardingApiOptions {
  saveQueries?: boolean;
}

export interface ScheduleOnboardingOptions {
  steps?: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
}

export function useOnboardingApi({ saveQueries = true }: UseOnboardingApiOptions = {}) {
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
      scheduleOnboardingTask: async (streamName: string, options?: ScheduleOnboardingOptions) => {
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
                ...(options?.steps !== undefined && { steps: options.steps }),
                ...(options?.connectors !== undefined && { connectors: options.connectors }),
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
    [saveQueries, signal, streamsRepositoryClient]
  );
}
