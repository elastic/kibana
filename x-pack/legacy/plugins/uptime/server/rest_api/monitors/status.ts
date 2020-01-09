/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/monitor/selected',
  validate: {
    query: schema.object({
      monitorId: schema.string(),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response): Promise<any> => {
    const { monitorId } = request.query;

    return response.ok({
      body: {
        ...(await libs.pings.getMonitor({ callES, monitorId })),
      },
    });
  },
});

export const createGetStatusBarRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/monitor/status',
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;
    const result = await libs.pings.getLatestMonitorStatus({
      callES,
      monitorId,
      dateStart,
      dateEnd,
    });
    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
