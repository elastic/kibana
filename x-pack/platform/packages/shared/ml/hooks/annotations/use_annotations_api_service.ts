/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AnnotationsApiService } from '@kbn/ml-services/ml_api_service/annotations';
import { annotationsApiProvider } from '@kbn/ml-services/ml_api_service/annotations';
import { useMlKibana } from '@kbn/ml-kibana-context';

/**
 * Hooks for accessing {@link AnnotationsApiService} in React components.
 */
export function useAnnotationsApiService(): AnnotationsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => annotationsApiProvider(httpService), [httpService]);
}
