/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteCreator } from '../types';

export const createGetSnapshotCount: UMRestApiRouteCreator = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/snapshot/count',
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      filters: schema.maybe(schema.string()),
      statusFilter: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async (_context, request, response): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, filters, statusFilter } = request.query;
    const result = await libs.monitorStates.getSnapshotCount(
      request,
      dateRangeStart,
      dateRangeEnd,
      filters,
      statusFilter
    );
    return response.ok({
      body: {
        ...result,
      },
    });
  },
});
