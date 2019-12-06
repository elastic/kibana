/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { UMServerLibs } from '../../lib/lib';
import { MonitorDetails } from '../../../common/runtime_types/monitor/monitor_details';

export const createGetMonitorLocationsRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/monitor/locations',
  options: {
    validate: {
      query: Joi.object({
        monitorId: Joi.string(),
        dateStart: Joi.string(),
        dateEnd: Joi.string(),
      }),
    },
    tags: ['access:uptime'],
  },
  handler: async (request: any): Promise<MonitorDetails> => {
    const { monitorId } = request.query;
    return await libs.monitors.getMonitorLocations(request, monitorId);
  },
});
