/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { nerModelsQueryKeys } from '../cache_keys';
import type { UseGetNerModelsAvailabilityParams } from './types';

const THIRTY_SECONDS = 30 * 1000;

interface TrainedModelStatsAvailabilityEntry {
  deployment_stats?: {
    state?: string;
    allocation_status?: {
      state?: string;
    };
    nodes?: Array<{
      routing_state?: {
        routing_state?: string;
      };
    }>;
  };
}

interface HttpErrorLike {
  statusCode?: number;
  body?: {
    statusCode?: number;
  };
}

const isUnauthorizedOrForbiddenError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const statusCode =
    (error as HttpErrorLike).statusCode ?? (error as HttpErrorLike).body?.statusCode;
  return statusCode === 401 || statusCode === 403;
};

const isStartedDeployment = (entry: TrainedModelStatsAvailabilityEntry): boolean => {
  const deploymentState = entry.deployment_stats?.state;
  const allocationState = entry.deployment_stats?.allocation_status?.state;
  const hasStartedNodeRouting = (entry.deployment_stats?.nodes ?? []).some(
    (node) => node.routing_state?.routing_state === 'started'
  );

  return (
    deploymentState === 'started' ||
    allocationState === 'started' ||
    allocationState === 'fully_allocated' ||
    hasStartedNodeRouting
  );
};

export const useGetNerModelsAvailability = ({
  client,
  modelIds,
  enabled = true,
}: UseGetNerModelsAvailabilityParams) =>
  useQuery({
    queryKey: nerModelsQueryKeys.availability(modelIds),
    queryFn: async () => {
      const unavailable: string[] = [];

      await Promise.all(
        modelIds.map(async (modelId) => {
          try {
            const stats = await client.getTrainedModelStats(modelId);
            const hasStartedDeployment = (stats.trained_model_stats ?? []).some((entry) =>
              isStartedDeployment(entry as TrainedModelStatsAvailabilityEntry)
            );
            if (!hasStartedDeployment) {
              unavailable.push(modelId);
            }
          } catch (error) {
            // Availability checks are informational only; auth failures should not imply model unavailability.
            if (isUnauthorizedOrForbiddenError(error)) {
              return;
            }
            unavailable.push(modelId);
          }
        })
      );

      return unavailable;
    },
    enabled: enabled && modelIds.length > 0,
    staleTime: THIRTY_SECONDS,
    refetchOnWindowFocus: false,
    retry: false,
  });
