/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaTelemetryAdapter } from '../../lib/adapters/telemetry';
import { UMRestApiRouteFactory } from '../types';

export const createLogOverviewPageRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: '/api/uptime/logOverview',
  validate: false,
  handler: async (_customParams, _context, _request, response): Promise<any> => {
    await KibanaTelemetryAdapter.countOverview();
    return response.ok();
  },
  options: {
    tags: ['access:uptime'],
  },
});
