/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { getTelemetry, initTelemetry, Telemetry } from './telemetry';

// TODO this type should be defined by the platform
interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

export function makeUsageCollector(server: KibanaHapiServer): void {
  const fileUploadUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'fileUploadTelemetry',
    isReady: () => true,
    fetch: async (): Promise<Telemetry> => (await getTelemetry(server)) || initTelemetry(),
  });
  server.usage.collectorSet.register(fileUploadUsageCollector);
}
