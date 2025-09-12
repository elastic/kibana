/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { DataFrameAnalyticsApiService } from '@kbn/ml-services/ml_api_service/data_frame_analytics';
import { dataFrameAnalyticsApiProvider } from '@kbn/ml-services/ml_api_service/data_frame_analytics';

/**
 * Hooks for accessing {@link DataFrameAnalyticsApiService} in React components.
 */
export function useDataFrameAnalyticsApiService(): DataFrameAnalyticsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => dataFrameAnalyticsApiProvider(httpService), [httpService]);
}
