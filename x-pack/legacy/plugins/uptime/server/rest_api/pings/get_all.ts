/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';

export const createGetAllRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/pings',
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      location: schema.maybe(schema.string()),
      monitorId: schema.maybe(schema.string()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, location, monitorId, size, sort, status } = request.query;

    const result = await libs.pings.getAll({
      callES,
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      status,
      sort,
      size,
      location,
    });

    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
