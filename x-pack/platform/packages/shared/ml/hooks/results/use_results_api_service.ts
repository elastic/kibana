/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { ResultsApiService } from '@kbn/ml-services/ml_api_service/results';
import { resultsApiProvider } from '@kbn/ml-services/ml_api_service/results';

/**
 * Hooks for accessing {@link ResultsApiService} in React components.
 */
export function useResultsApiService(): ResultsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => resultsApiProvider(httpService), [httpService]);
}
