/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMapsTelemetry, TELEMETRY_TYPE } from './maps_telemetry';

export function initTelemetryCollection(usageCollection, server) {
  if (!usageCollection) {
    return;
  }

  const mapsUsageCollector = usageCollection.makeUsageCollector({
    type: TELEMETRY_TYPE,
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(server),
  });

  usageCollection.registerCollector(mapsUsageCollector);
}
