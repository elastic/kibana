/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { UMServerLibs } from '../../lib/lib';
import { SnapshotCount } from '../../../common/graphql/types';

export const createGetSnapshotCount = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/snapshot/count',
  options: {
    validate: {
      query: Joi.object({
        dateRangeStart: Joi.string().required(),
        dateRangeEnd: Joi.string().required(),
        filters: Joi.string(),
        statusFilter: Joi.string(),
      }),
    },
    tags: ['access:uptime'],
  },
  handler: async (request: any): Promise<SnapshotCount> => {
    const { dateRangeStart, dateRangeEnd, filters, statusFilter } = request.query;
    return await libs.monitorStates.getSnapshotCount(
      request,
      dateRangeStart,
      dateRangeEnd,
      filters,
      statusFilter
    );
  },
});
