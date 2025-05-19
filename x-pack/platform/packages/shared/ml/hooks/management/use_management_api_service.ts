/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { ManagementApiService } from '@kbn/ml-services/ml_api_service/management';
import { managementApiProvider } from '@kbn/ml-services/ml_api_service/management';

/**
 * Hooks for accessing {@link ManagementApiService} in React components.
 */
export function useManagementApiService(): ManagementApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => managementApiProvider(httpService), [httpService]);
}
