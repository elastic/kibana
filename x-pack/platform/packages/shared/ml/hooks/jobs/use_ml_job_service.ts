/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlJobServiceFactory } from '@kbn/ml-services/job_service';

import { useMlApi } from '../use_ml_api';

export const useMlJobService = () => {
  const mlApi = useMlApi();
  return mlJobServiceFactory(mlApi);
};
