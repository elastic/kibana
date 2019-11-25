/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { PluginSetupContract as UsageCollection } from 'src/plugins/usage_collection/server';
import { getTelemetry, initTelemetry, Telemetry } from './telemetry';

export function registerFileUploadUsageCollector(
  usageCollection: UsageCollection,
  server: Server
): void {
  const fileUploadUsageCollector = usageCollection.makeUsageCollector({
    type: 'fileUploadTelemetry',
    isReady: () => true,
    fetch: async (): Promise<Telemetry> => (await getTelemetry(server)) || initTelemetry(),
  });

  usageCollection.registerCollector(fileUploadUsageCollector);
}
