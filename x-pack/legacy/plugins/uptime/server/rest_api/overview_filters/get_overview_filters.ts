/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteCreator } from '../types';

export const createGetOverviewFilters: UMRestApiRouteCreator = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/filters',
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      filters: schema.maybe(schema.string()),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async (_context, request, response) => {
    const { dateRangeStart, dateRangeEnd, filters } = request.query;

    const filtersResponse = await libs.monitors.getFilterBar(
      request,
      dateRangeStart,
      dateRangeEnd,
      filters
    );
    return response.ok({ body: { ...filtersResponse } });
  },
});
