/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { beatsListingRoute } from './beats';
import { beatsDetailRoute } from './beat_detail';
import { beatsOverviewRoute } from './overview';

export function registerV1BeatsRoutes(server: MonitoringCore) {
  beatsDetailRoute(server);
  beatsListingRoute(server);
  beatsOverviewRoute(server);
}
