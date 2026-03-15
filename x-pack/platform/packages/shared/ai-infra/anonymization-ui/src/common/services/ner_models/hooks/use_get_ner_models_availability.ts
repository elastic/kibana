/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { nerModelsQueryKeys } from '../cache_keys';
import type { TrainedModelDeploymentStats } from '../client';
import type { UseGetNerModelsAvailabilityParams } from './types';

const THIRTY_SECONDS = 30 * 1000;

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

  const httpError = error as HttpErrorLike;
  const statusCode = httpError.statusCode ?? httpError.body?.statusCode;
  return statusCode === 401 || statusCode === 403;
};

const isStartedDeployment = (deploymentStats: TrainedModelDeploymentStats | undefined): boolean => {
  const deploymentState = deploymentStats?.state;
  const allocationState = deploymentStats?.allocation_status?.state;
  const hasStartedNodeRouting = (deploymentStats?.nodes ?? []).some(
    (node) => node.routing_state?.routing_state === 'started'
  );

  return (
    deploymentState === 'started' ||
    allocationState === 'started' ||
    allocationState === 'fully_allocated' ||
    hasStartedNodeRouting
  );
};

export const buildNerModelsAvailabilityQueryFn =
  (client: UseGetNerModelsAvailabilityParams['client'], modelIds: string[]) => async () => {
    const unavailable: string[] = [];

    await Promise.all(
      modelIds.map(async (modelId) => {
        try {
          const stats = await client.getTrainedModelStats(modelId);
          const hasStartedDeployment = (stats.trained_model_stats ?? []).some((entry) =>
            isStartedDeployment(entry.deployment_stats)
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
  };

export const useGetNerModelsAvailability = ({
  client,
  modelIds,
  enabled = true,
}: UseGetNerModelsAvailabilityParams) =>
  useQuery({
    queryKey: nerModelsQueryKeys.availability(modelIds),
    queryFn: buildNerModelsAvailabilityQueryFn(client, modelIds),
    enabled: enabled && modelIds.length > 0,
    staleTime: THIRTY_SECONDS,
    refetchOnWindowFocus: false,
    retry: false,
  });
