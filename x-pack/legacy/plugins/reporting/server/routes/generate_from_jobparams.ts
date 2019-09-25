/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from '@hapi/boom';
import Joi from '@hapi/joi';
import { Request, ResponseToolkit } from '@hapi/hapi';
import rison from 'rison-node';
import { API_BASE_URL } from '../../common/constants';
import { KbnServer } from '../../types';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction } from './types';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerGenerateFromJobParams(
  server: KbnServer,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);

  // generate report
  server.route({
    path: `${BASE_GENERATE}/{exportType}`,
    method: 'POST',
    config: {
      ...getRouteConfig(request => request.params.exportType),
      validate: {
        params: Joi.object({
          exportType: Joi.string().required(),
        }).required(),
        payload: Joi.object({
          jobParams: Joi.string()
            .optional()
            .default(null),
        }).allow(null), // allow optional payload
        query: Joi.object({
          jobParams: Joi.string().default(null),
        }).default(),
      },
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      let jobParamsRison: string | null;

      if (request.payload) {
        const { jobParams: jobParamsPayload } = request.payload as { jobParams: string };
        jobParamsRison = jobParamsPayload;
      } else {
        const { jobParams: queryJobParams } = request.query as { jobParams: string };
        if (queryJobParams) {
          jobParamsRison = queryJobParams;
        } else {
          jobParamsRison = null;
        }
      }

      if (!jobParamsRison) {
        throw boom.badRequest('A jobParams RISON string is required');
      }

      const { exportType } = request.params;
      let response;
      try {
        const jobParams = rison.decode(jobParamsRison);
        response = await handler(exportType, jobParams, request, h);
      } catch (err) {
        throw boom.badRequest(`invalid rison: ${jobParamsRison}`);
      }
      return response;
    },
  });

  // show error about GET method to user
  server.route({
    path: `${BASE_GENERATE}/{p*}`,
    method: 'GET',
    config: getRouteConfig(),
    handler: () => {
      const err = boom.methodNotAllowed('GET is not allowed');
      err.output.headers.allow = 'POST';
      return err;
    },
  });
}
