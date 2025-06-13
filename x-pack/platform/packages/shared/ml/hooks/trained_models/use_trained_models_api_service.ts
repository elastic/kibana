/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { TrainedModelsApiService } from '@kbn/ml-services/ml_api_service/trained_models';
import { trainedModelsApiProvider } from '@kbn/ml-services/ml_api_service/trained_models';

/**
 * Hooks for accessing {@link TrainedModelsApiService} in React components.
 */
export function useTrainedModelsApiService(): TrainedModelsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => trainedModelsApiProvider(httpService), [httpService]);
}
