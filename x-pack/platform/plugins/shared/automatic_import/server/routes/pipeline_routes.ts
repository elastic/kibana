/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { CheckPipelineRequestBody, CheckPipelineResponse, CHECK_PIPELINE_PATH } from '../../common';
import {
  ACTIONS_AND_CONNECTORS_ALL_ROLE,
  FLEET_ALL_ROLE,
  INTEGRATIONS_ALL_ROLE,
  ROUTE_HANDLER_TIMEOUT,
} from '../constants';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { testPipeline } from '../util/pipeline';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';

export function registerPipelineRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: CHECK_PIPELINE_PATH,
      access: 'internal',
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            requiredPrivileges: [
              FLEET_ALL_ROLE,
              INTEGRATIONS_ALL_ROLE,
              ACTIONS_AND_CONNECTORS_ALL_ROLE,
            ],
          },
        },
        validate: {
          request: {
            body: buildRouteValidationWithZod(CheckPipelineRequestBody),
          },
        },
      },
      withAvailability(
        async (context, req, res): Promise<IKibanaResponse<CheckPipelineResponse>> => {
          const { rawSamples, pipeline } = req.body;
          const services = await context.resolve(['core']);
          const { client } = services.core.elasticsearch;
          try {
            const { errors, pipelineResults } = await testPipeline(rawSamples, pipeline, client);
            if (errors?.length) {
              return res.badRequest({ body: JSON.stringify(errors) });
            }
            return res.ok({
              body: CheckPipelineResponse.parse({ results: { docs: pipelineResults } }),
            });
          } catch (err) {
            try {
              handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT);
            } catch (e) {
              if (isErrorThatHandlesItsOwnResponse(e)) {
                return e.sendResponse(res);
              }
            }
            return res.badRequest({ body: err });
          }
        }
      )
    );
}
