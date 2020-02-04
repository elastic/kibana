/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createGetOverviewFilters } from './overview_filters';
import { createGetAllRoute } from './pings';
import { createGetIndexPatternRoute } from './index_pattern';
import { createLogMonitorPageRoute, createLogOverviewPageRoute } from './telemetry';
import { createGetSnapshotCount } from './snapshot';
import { UMRestApiRouteFactory } from './types';
import {
  createGetMonitorRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
} from './monitors';
import { createGetPingHistogramRoute } from './pings/get_ping_histogram';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';
export const restApiRoutes: UMRestApiRouteFactory[] = [
  createGetOverviewFilters,
  createGetAllRoute,
  createGetIndexPatternRoute,
  createGetMonitorRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetStatusBarRoute,
  createGetSnapshotCount,
  createLogMonitorPageRoute,
  createLogOverviewPageRoute,
  createGetPingHistogramRoute,
];
