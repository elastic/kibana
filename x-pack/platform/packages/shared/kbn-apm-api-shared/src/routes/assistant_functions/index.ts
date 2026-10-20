/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getApmTimeseriesRoute } from './get_apm_timeseries';
import { getDownstreamDependenciesRoute } from './get_downstream_dependencies';

export const assistantFunctionsRouteDefinitions = {
  getApmTimeseries: getApmTimeseriesRoute,
  getDownstreamDependencies: getDownstreamDependenciesRoute,
};

export type { GetApmTimeseriesResponse } from './get_apm_timeseries';
export type { GetDownstreamDependenciesResponse } from './get_downstream_dependencies';
