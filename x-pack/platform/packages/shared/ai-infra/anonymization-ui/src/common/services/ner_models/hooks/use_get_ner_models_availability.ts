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
            const hasStartedDeployment = (stats.trained_model_stats ?? []).some(
              (entry) => entry.deployment_stats?.state === 'started'
            );
            if (!hasStartedDeployment) {
              unavailable.push(modelId);
            }
          } catch {
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
