/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { servicesFlamegraphRoute } from './flamegraph';
import { servicesFunctionsRoute } from './functions';
import { profilingStatusRoute } from './status';
import { profilingHostsFlamegraphRoute } from './hosts_flamegraph';
import { profilingHostsFunctionsRoute } from './hosts_functions';

export const profilingRouteDefinitions = {
  flamegraph: servicesFlamegraphRoute,
  functions: servicesFunctionsRoute,
  status: profilingStatusRoute,
  hostsFlamegraph: profilingHostsFlamegraphRoute,
  hostsFunctions: profilingHostsFunctionsRoute,
};

export type { ServicesFlamegraphResponse } from './flamegraph';
export type { ServicesFunctionsResponse } from './functions';
export type { ProfilingStatusResponse } from './status';
export type { ProfilingHostsFlamegraphResponse } from './hosts_flamegraph';
export type { ProfilingHostsFunctionsResponse } from './hosts_functions';
