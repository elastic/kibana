/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { indexPatternRoute } from './index_pattern';
import {
  errorDistributionRoute,
  errorGroupsRoute,
  errorsRoute
} from './errors';
import { createApi } from './create_api';

const createApmApi = () => {
  const api = createApi()
    .add(indexPatternRoute)
    .add(errorDistributionRoute)
    .add(errorGroupsRoute)
    .add(errorsRoute);

  return api;
};

export type APMAPI = ReturnType<typeof createApmApi>;

export { createApmApi };
