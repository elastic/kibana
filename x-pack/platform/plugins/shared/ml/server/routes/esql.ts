/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlService } from '@kbn/esql-server-utils';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import { getEsqlColumnsRequestSchema, getEsqlColumnsResponseSchema } from './schemas/esql_schema';

/** Routes for retrieving ES|QL output column metadata. */
export function esqlRoutes({ router, routeGuard }: RouteInitialization) {
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/esql/columns`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateJob'],
        },
      },
      summary: 'Gets ES|QL query columns',
      description: 'Gets normalized output column metadata for an ES|QL query.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: getEsqlColumnsRequestSchema },
          response: {
            200: {
              body: getEsqlColumnsResponseSchema,
              description: 'ES|QL query columns',
            },
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const service = new EsqlService({ client: client.asCurrentUser });
          const columns = await service.getColumns(request.body.query);

          return response.ok({ body: { columns } });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );
}
