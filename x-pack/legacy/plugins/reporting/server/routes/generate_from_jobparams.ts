/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { IRouter, IBasePath } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { HandlerErrorFunction, HandlerFunction } from './types';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { ReportingSetupDeps } from '../types';
import { makeRequestFacade } from './lib/make_request_facade';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerGenerateFromJobParams(
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
) {
  const config = reporting.getConfig();
  const userHandler = authorizedUserPreRoutingFactory(config, plugins);

  router.post(
    {
      path: `${BASE_GENERATE}/{exportType}`,
      validate: {
        params: schema.object({
          exportType: schema.string({ minLength: 2 }),
        }),
        body: schema.maybe(
          schema.object({
            jobParams: schema.maybe(schema.string()),
          })
        ),
        query: schema.object({
          jobParams: schema.string({
            defaultValue: '',
          }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      const { username } = user;
      const request = makeRequestFacade(context, req, basePath);
      let jobParamsRison: string | null;

      if (request.body) {
        const { jobParams: jobParamsPayload } = request.body as { jobParams: string };
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
        return res.customError({
          statusCode: 400,
          body: 'A jobParams RISON string is required',
        });
      }

      const { exportType } = request.params as { exportType: string };
      let jobParams;

      try {
        jobParams = rison.decode(jobParamsRison) as object | null;
        if (!jobParams) {
          return res.customError({
            statusCode: 400,
            body: 'Missing jobParams!',
          });
        }
      } catch (err) {
        return res.customError({
          statusCode: 400,
          body: `invalid rison: ${jobParamsRison}`,
        });
      }

      try {
        return await handler(username, exportType, jobParams, request, res);
      } catch (err) {
        return handleError(exportType, err, res);
      }
    })
  );

  // Get route to generation endpoint: show error about GET method to user
  router.get(
    {
      path: `${BASE_GENERATE}/{p*}`,
      validate: false,
    },
    (context, req, res) => {
      return res.customError({ statusCode: 405, body: 'GET is not allowed' });
    }
  );
}
