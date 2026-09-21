/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceAccountParamsSchema } from './schemas';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const unavailable = (reason: string) => ({
  body: { message: `Service accounts are not available: ${reason}` },
});

export function defineGetServiceAccountRoute({
  router,
  getServiceAccountsService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/service_account/{id}',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the service accounts backend, which requires the `read_security` cluster privilege',
        },
      },
      validate: { params: getServiceAccountParamsSchema },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const serviceAccounts = getServiceAccountsService();
        if (!serviceAccounts) {
          return response.notFound(unavailable('the feature is disabled'));
        }

        return response.ok({
          body: await serviceAccounts.backend.get(request, request.params.id),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
