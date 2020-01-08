/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  createMlTelemetry,
  getSavedObjectsClient,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  MlTelemetrySavedObject,
} from './ml_telemetry';

import { UsageInitialization } from '../../new_platform/plugin';

export function makeMlUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  { elasticsearchPlugin, savedObjects }: UsageInitialization
): void {
  if (!usageCollection) {
    return;
  }

  const mlUsageCollector = usageCollection.makeUsageCollector({
    type: 'ml',
    isReady: () => true,
    fetch: async (): Promise<MlTelemetry> => {
      try {
        const savedObjectsClient = getSavedObjectsClient(elasticsearchPlugin, savedObjects);
        const mlTelemetrySavedObject = (await savedObjectsClient.get(
          'ml-telemetry',
          ML_TELEMETRY_DOC_ID
        )) as MlTelemetrySavedObject;
        return mlTelemetrySavedObject.attributes;
      } catch (err) {
        return createMlTelemetry();
      }
    },
  });

  usageCollection.registerCollector(mlUsageCollector);
}
