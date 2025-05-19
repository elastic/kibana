/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '@kbn/ml-kibana-context';
import type { SavedObjectsApiService } from '@kbn/ml-services/ml_api_service/saved_objects';
import { savedObjectsApiProvider } from '@kbn/ml-services/ml_api_service/saved_objects';

/**
 * Hooks for accessing {@link SavedObjectsApiService} in React components.
 */
export function useSavedObjectsApiService(): SavedObjectsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => savedObjectsApiProvider(httpService), [httpService]);
}
