/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { downstreamDependenciesRouteRt, type APMDownstreamDependency } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface GetDownstreamDependenciesResponse {
  content: APMDownstreamDependency[];
}

export const getDownstreamDependenciesRoute = defineRoute<GetDownstreamDependenciesResponse>()({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
});
