/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteServiceAccountQuerySchema, getServiceAccountParamsSchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import type { RouteDefinitionParams } from '..';
import type {
  DeleteServiceAccountConflictAttributes,
  DeleteServiceAccountResponse,
} from '../../../common/service_accounts';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineDeleteServiceAccountRoute({
  router,
  getServiceAccountsService,
}: RouteDefinitionParams) {
  router.delete(
    {
      path: '/internal/security/service_account/{id}',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the service accounts backend, which requires the `manage_security` cluster privilege',
        },
      },
      validate: {
        params: getServiceAccountParamsSchema,
        query: deleteServiceAccountQuerySchema,
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const serviceAccounts = getServiceAccountsService();
        if (!serviceAccounts) {
          return response.notFound(serviceAccountsUnavailable('the feature is disabled'));
        }

        const { id } = request.params;
        const result = await serviceAccounts.management.delete(request, id, {
          force: request.query.force,
        });

        if (!result.deleted) {
          const count = result.workloads.length;
          const attributes: DeleteServiceAccountConflictAttributes = {
            workloads: result.workloads,
          };
          return response.conflict({
            body: {
              message: `Service account [${id}] is still bound to ${count} ${
                count === 1 ? 'workload' : 'workloads'
              }. Unbind them first.`,
              attributes,
            },
          });
        }

        const body: DeleteServiceAccountResponse = { warnings: result.warnings };
        return response.ok({ body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
