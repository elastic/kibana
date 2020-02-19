/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getTelemetry, initTelemetry } from './telemetry';

const TELEMETRY_TYPE = 'fileUploadTelemetry';

export function registerFileUploadUsageCollector(
  usageCollection: UsageCollectionSetup,
  deps: {
    getSavedObjectsRepository: any;
  }
): void {
  const { getSavedObjectsRepository } = deps;
  const fileUploadUsageCollector = usageCollection.makeUsageCollector({
    type: TELEMETRY_TYPE,
    isReady: () => true,
    fetch: async () => (await getTelemetry(getSavedObjectsRepository)) || initTelemetry(),
  });

  usageCollection.registerCollector(fileUploadUsageCollector);
}
