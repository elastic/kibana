/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMapsTelemetry } from './maps_telemetry';
import { TELEMETRY_TYPE } from '../../common/constants';

export function initTelemetryCollection(server) {
  const mapsUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: TELEMETRY_TYPE,
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(server),
  });

  server.usage.collectorSet.register(mapsUsageCollector);
}
