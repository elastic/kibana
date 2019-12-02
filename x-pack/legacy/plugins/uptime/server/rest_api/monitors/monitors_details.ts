/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { UMServerLibs } from '../../lib/lib';
import { MonitorDetails } from '../../../common/runtime_types/monitor/monitor_details';

export const createGetMonitorDetailsRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/monitor/details',
  options: {
    validate: {
      query: Joi.object({
        monitorId: Joi.string(),
      }),
    },
    tags: ['access:uptime'],
  },
  handler: async (request: any): Promise<MonitorDetails> => {
    const { monitorId } = request.query;
    return await libs.monitors.getMonitorDetails(request, monitorId);
  },
});
