/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { objectValuesToArrays } from '../../lib/helper';

const arrayOrStringType = schema.maybe(
  schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
);

export const createGetOverviewFilters: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/filters',
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      search: schema.maybe(schema.string()),
      locations: arrayOrStringType,
      schemes: arrayOrStringType,
      ports: arrayOrStringType,
      tags: arrayOrStringType,
    }),
  },

  options: {
    tags: ['access:uptime'],
  },
  handler: async ({ callES }, _context, request, response) => {
    const { dateRangeStart, dateRangeEnd, locations, schemes, search, ports, tags } = request.query;

    let parsedSearch: Record<string, any> | undefined;
    if (search) {
      try {
        parsedSearch = JSON.parse(search);
      } catch (e) {
        return response.badRequest();
      }
    }

    const filtersResponse = await libs.monitors.getFilterBar({
      callES,
      dateRangeStart,
      dateRangeEnd,
      search: parsedSearch,
      filterOptions: objectValuesToArrays<string>({
        locations,
        ports,
        schemes,
        tags,
      }),
    });

    return response.ok({ body: { ...filtersResponse } });
  },
});
