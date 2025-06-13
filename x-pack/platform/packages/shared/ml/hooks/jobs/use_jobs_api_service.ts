/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { JobsApiService } from '@kbn/ml-services/ml_api_service/jobs';
import { jobsApiProvider } from '@kbn/ml-services/ml_api_service/jobs';

/**
 * Hooks for accessing {@link JobsApiService} in React components.
 */
export function useJobsApiService(): JobsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => jobsApiProvider(httpService), [httpService]);
}
