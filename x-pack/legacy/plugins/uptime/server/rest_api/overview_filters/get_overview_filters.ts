/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteCreator } from '../types';

const stringToArray = (locations: string | string[] | undefined) =>
  locations ? (Array.isArray(locations) ? locations : [locations]) : [];

export const createGetOverviewFilters: UMRestApiRouteCreator = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/filters',
  validate: {
    query: schema.object({
      dateRangeStart: schema.string(),
      dateRangeEnd: schema.string(),
      search: schema.maybe(schema.string()),
      locations: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      schemes: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      ports: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      tags: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
    }),
  },
  options: {
    tags: ['access:uptime'],
  },
  handler: async (_context, request, response) => {
    const { dateRangeStart, dateRangeEnd, locations, schemes, search, ports, tags } = request.query;

    let searchObject: Record<string, any> | undefined;
    if (search) {
      try {
        searchObject = JSON.parse(search);
      } catch (e) {
        return response.badRequest();
      }
    }
    const filtersResponse = await libs.monitors.getFilterBar(
      request,
      dateRangeStart,
      dateRangeEnd,
      searchObject,
      {
        locations: stringToArray(locations),
        ports: stringToArray(ports),
        tags: stringToArray(tags),
        schemes: stringToArray(schemes),
      }
    );
    return response.ok({ body: { ...filtersResponse } });
  },
});
