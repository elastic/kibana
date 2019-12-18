/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetStatusBarRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/monitor/status',
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
      location: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response): Promise<any> => {
    const { monitorId, dateStart, dateEnd, location } = request.query;
    const result = await libs.pings.getLatestMonitorStatus({
      callES,
      monitorId,
      dateStart,
      dateEnd,
      location,
    });
    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
