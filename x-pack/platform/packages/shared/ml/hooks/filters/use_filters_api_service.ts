/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { FiltersApiService } from '@kbn/ml-services/ml_api_service/filters';
import { filtersApiProvider } from '@kbn/ml-services/ml_api_service/filters';

/**
 * Hooks for accessing {@link FiltersApiService} in React components.
 */
export function useFiltersApiService(): FiltersApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => filtersApiProvider(httpService), [httpService]);
}
