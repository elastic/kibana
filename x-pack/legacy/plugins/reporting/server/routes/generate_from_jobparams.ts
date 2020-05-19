/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import rison from 'rison-node';
import { IRouter, IBasePath } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { HandlerErrorFunction, HandlerFunction } from './types';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger as Logger } from '../lib';
import { ReportingSetupDeps } from '../types';
import { makeRequestFacade } from './lib/make_request_facade';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerGenerateFromJobParams(
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  handler: HandlerFunction,
  handleError: HandlerErrorFunction,
  logger: Logger
) {
  // generate report
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
    router.handleLegacyErrors(async (context, req, res) => {
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
        throw boom.badRequest('A jobParams RISON string is required');
      }

      const { exportType } = request.params as { exportType: string };
      let jobParams;
      let response;
      try {
        jobParams = rison.decode(jobParamsRison) as object | null;
        if (!jobParams) {
          throw new Error('missing jobParams!');
        }
      } catch (err) {
        throw boom.badRequest(`invalid rison: ${jobParamsRison}`);
      }
      try {
        response = await handler(exportType, jobParams, request, res);
      } catch (err) {
        throw handleError(exportType, err);
      }
      return response;
    })
  );

  // Get route to generation endpoint: show error about GET method to user
  router.get(
    {
      path: `${BASE_GENERATE}/{p*}`,
      validate: false,
    },
    router.handleLegacyErrors(() => {
      throw boom.methodNotAllowed('GET is not allowed');
    })
  );
}
