/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createGetAllRoute } from './pings';
import { createGetIndexPatternRoute } from './index_pattern';
import { createLogMonitorPageRoute, createLogOverviewPageRoute } from './telemetry';
import { createGetSnapshotCount } from './snapshot';
import { UMRestApiRouteCreator } from './types';
import { createGetMonitorDetailsRoute, createGetMonitorLocationsRoute } from './monitors';

export * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export const restApiRoutes: UMRestApiRouteCreator[] = [
  createGetAllRoute,
  createGetIndexPatternRoute,
  createGetMonitorDetailsRoute,
  createGetMonitorLocationsRoute,
  createGetSnapshotCount,
  createLogMonitorPageRoute,
  createLogOverviewPageRoute,
];
