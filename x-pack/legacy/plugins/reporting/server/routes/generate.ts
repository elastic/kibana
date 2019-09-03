/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { Request, ResponseToolkit } from 'hapi';
import rison from 'rison-node';
import { API_BASE_URL } from '../../common/constants';
import { KbnServer } from '../../types';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction } from './types';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerGenerate(
  server: KbnServer,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);

  // generate report
  server.route({
    path: `${BASE_GENERATE}/{exportType}`,
    method: 'POST',
    config: getRouteConfig(request => request.params.exportType),
    handler: async (request: Request, h: ResponseToolkit) => {
      const { exportType } = request.params;
      let response;
      try {
        // @ts-ignore
        const jobParams = rison.decode(request.query.jobParams);
        response = await handler(exportType, jobParams, request, h);
      } catch (err) {
        throw handleError(exportType, err);
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
