/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { UMServerLibs } from '../../lib/lib';
import { Snapshot } from '../../../common/runtime_types';
import { UMRestApiRouteCreator } from '../types';

export const createGetSnapshotCount: UMRestApiRouteCreator = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/snapshot/count',
  validate: {
    query: Joi.object({
      dateRangeStart: Joi.string().required(),
      dateRangeEnd: Joi.string().required(),
      filters: Joi.string(),
      statusFilter: Joi.string(),
    }),
  },
  tags: ['access:uptime'],
  handler: async (_context: any, request: any, response: any): Promise<Snapshot> => {
    const { dateRangeStart, dateRangeEnd, filters, statusFilter } = request.query;
    return response.ok({
      body: await libs.monitorStates.getSnapshotCount(
        request,
        dateRangeStart,
        dateRangeEnd,
        filters,
        statusFilter
      ),
    });
  },
});
