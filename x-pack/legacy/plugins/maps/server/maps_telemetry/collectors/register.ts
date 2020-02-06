/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
// @ts-ignore
import { getMapsTelemetry } from '../maps_telemetry';
import { TELEMETRY_TYPE } from '../../../common/constants';

export function registerMapsUsageCollector(
  usageCollection: UsageCollectionSetup,
  savedObjectsClient: any,
  config: Function
): void {
  if (!usageCollection) {
    return;
  }

  const mapsUsageCollector = usageCollection.makeUsageCollector({
    type: TELEMETRY_TYPE,
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(savedObjectsClient, config),
  });

  usageCollection.registerCollector(mapsUsageCollector);
}
