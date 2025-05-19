/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMlApi } from '../use_ml_api';

export function useMlResultsService(): MlResultsService {
  const mlApi = useMlApi();
  return mlResultsServiceProvider(mlApi);
}
