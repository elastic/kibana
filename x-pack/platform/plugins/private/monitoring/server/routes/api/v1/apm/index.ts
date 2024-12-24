/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { apmInstanceRoute } from './instance';
import { apmInstancesRoute } from './instances';
import { apmOverviewRoute } from './overview';

export function registerV1ApmRoutes(server: MonitoringCore) {
  apmInstanceRoute(server);
  apmInstancesRoute(server);
  apmOverviewRoute(server);
}
