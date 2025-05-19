/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { AlertingApiService } from '@kbn/ml-services/ml_api_service/alerting';
import { alertingApiProvider } from '@kbn/ml-services/ml_api_service/alerting';

/**
 * Hooks for accessing {@link AlertingApiService} in React components.
 */
export function useAlertingApiService(): AlertingApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => alertingApiProvider(httpService), [httpService]);
}
