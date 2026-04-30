/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { OnboardingStep } from '@kbn/streams-schema';
import { useMemo } from 'react';
import type { WorkflowExecutionResult } from '@kbn/streams-plugin/server/lib/workflows/workflow_execution_client';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

export type { WorkflowExecutionResult };

export interface RunOnboardingOptions {
  steps?: OnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
}

export function useOnboardingApi() {
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
      runOnboarding: async (
        streamName: string,
        options?: RunOnboardingOptions
      ): Promise<WorkflowExecutionResult> => {
        const { from, to } = getLast24HoursTimeRange();

        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_run',
          {
            signal,
            params: {
              path: { streamName },
              body: {
                from,
                to,
                ...(options?.steps !== undefined && { steps: options.steps }),
                ...(options?.connectors !== undefined && { connectors: options.connectors }),
              },
            },
          }
        );
      },
      getOnboardingExecution: async (streamName: string): Promise<WorkflowExecutionResult> => {
        return streamsRepositoryClient.fetch(
          'GET /internal/streams/{streamName}/onboarding/_execution',
          {
            signal,
            params: {
              path: { streamName },
            },
          }
        );
      },
      cancelOnboarding: async (streamName: string) => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{streamName}/onboarding/_cancel',
          {
            signal,
            params: {
              path: { streamName },
            },
          }
        );
      },
    }),
    [signal, streamsRepositoryClient]
  );
}
