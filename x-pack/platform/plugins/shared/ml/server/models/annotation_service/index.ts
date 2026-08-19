/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { annotationProvider } from './annotation';
import type { MlClient } from '../../lib/ml_client/types';

export function annotationServiceProvider(client: IScopedClusterClient, mlClient: MlClient) {
  return {
    ...annotationProvider(client, mlClient),
  };
}
