/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from './use_kibana';

export interface EisInferenceEndpoint {
  inferenceId: string;
  taskType: InferenceTaskType;
  service: string;
  serviceSettings?: Record<string, unknown>;
}

const EIS_MODELS_QUERY_KEY = 'eis-models';

export const useEisModels = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [EIS_MODELS_QUERY_KEY],
    queryFn: async () => {
      const response = await services.http.get<{
        endpoints: EisInferenceEndpoint[];
      }>('/internal/inference/endpoints');

      return response.endpoints;
    },
  });
};
