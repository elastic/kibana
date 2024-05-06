/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore, RouteDependencies } from '../../../../types';
import { enableAlertsRoute } from './enable';
import { alertStatusRoute } from './status';

export function registerV1AlertRoutes(server: MonitoringCore, npRoute: RouteDependencies) {
  alertStatusRoute(npRoute);
  enableAlertsRoute(server, npRoute);
}
