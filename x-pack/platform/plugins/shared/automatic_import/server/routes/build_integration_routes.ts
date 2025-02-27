/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { BuildIntegrationRequestBody, INTEGRATION_BUILDER_PATH } from '../../common';
import { buildPackage } from '../integration_builder';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';
import {
  ACTIONS_AND_CONNECTORS_ALL_ROLE,
  FLEET_ALL_ROLE,
  INTEGRATIONS_ALL_ROLE,
} from '../constants';
export function registerIntegrationBuilderRoutes(
  router: IRouter<AutomaticImportRouteHandlerContext>
) {
  router.versioned
    .post({
      path: INTEGRATION_BUILDER_PATH,
      access: 'internal',
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
            body: buildRouteValidationWithZod(BuildIntegrationRequestBody),
          },
        },
      },
      withAvailability(async (_, request, response) => {
        const { integration } = request.body;
        try {
          const zippedIntegration = await buildPackage(integration);
          return response.custom({
            statusCode: 200,
            body: zippedIntegration,
            headers: { 'Content-Type': 'application/zip' },
          });
        } catch (err) {
          try {
            handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT);
          } catch (e) {
            if (isErrorThatHandlesItsOwnResponse(e)) {
              return e.sendResponse(response);
            }
          }
          return response.customError({ statusCode: 500, body: err });
        }
      })
    );
}
