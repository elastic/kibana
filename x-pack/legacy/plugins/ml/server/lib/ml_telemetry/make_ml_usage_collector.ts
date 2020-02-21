/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SavedObjectsServiceStart } from 'src/core/server';
import {
  createMlTelemetry,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  MlTelemetrySavedObject,
} from './ml_telemetry';

export function makeMlUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  savedObjects: SavedObjectsServiceStart
): void {
  if (!usageCollection) {
    return;
  }

  const mlUsageCollector = usageCollection.makeUsageCollector({
    type: 'ml',
    isReady: () => true,
    fetch: async (): Promise<MlTelemetry> => {
      try {
        const mlTelemetrySavedObject: MlTelemetrySavedObject = await savedObjects
          .createInternalRepository()
          .get('ml-telemetry', ML_TELEMETRY_DOC_ID);

        return mlTelemetrySavedObject.attributes;
      } catch (err) {
        return createMlTelemetry();
      }
    },
  });

  usageCollection.registerCollector(mlUsageCollector);
}
