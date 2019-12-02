/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { UMServerLibs } from '../../lib/lib';

export const createGetOverviewFilters = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/filters',
  options: {
    validate: {
      query: Joi.object({
        filters: Joi.string(),
        dateRangeStart: Joi.string().required(),
        dateRangeEnd: Joi.string().required(),
      }),
    },
    tags: ['access:uptime'],
  },
  handler: async (request: any): Promise<unknown> => {
    const { dateRangeStart, dateRangeEnd, filters } = request.query;
    console.log('filters', filters);

    const c = await libs.monitors.getFilterBar(request, dateRangeStart, dateRangeEnd, filters);
    return {
      ...c,
    };
  },
});
