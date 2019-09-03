/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaTelemetryAdapter } from '../../lib/adapters/telemetry';

export const createLogMonitorPageRoute = () => ({
  method: 'POST',
  path: '/api/uptime/logMonitor',
  handler: async (request: any, h: any): Promise<void> => {
    await KibanaTelemetryAdapter.countMonitor();
    return h.response().code(200);
  },
  options: {
    tags: ['access:uptime'],
  },
});
