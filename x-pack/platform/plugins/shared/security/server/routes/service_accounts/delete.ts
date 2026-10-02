/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serviceAccountIdParamsSchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import type { RouteDefinitionParams } from '..';
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
      validate: { params: serviceAccountIdParamsSchema },
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

        await serviceAccounts.backend.delete(request, request.params.id);
        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
