/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetPingHistogramRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/ping/histogram',
  validate: {
    query: schema.object({
      dateStart: schema.string(),
      dateEnd: schema.string(),
      monitorId: schema.maybe(schema.string()),
      statusFilter: schema.maybe(schema.string()),
      filters: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response): Promise<any> => {
    const { dateStart, dateEnd, statusFilter, monitorId, filters } = request.query;

    const result = await libs.pings.getPingHistogram({
      callES,
      dateStart,
      dateEnd,
      monitorId,
      statusFilter,
      filters,
    });

    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
