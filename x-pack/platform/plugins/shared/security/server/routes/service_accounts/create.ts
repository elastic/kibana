/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceAccountBodySchema } from './schemas';
import type { RouteDefinitionParams } from '..';
import { SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES } from '../../../common/service_accounts';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const unavailable = (reason: string) => ({
  body: { message: `Service accounts are not available: ${reason}` },
});

export function defineCreateServiceAccountRoute({
  router,
  getServiceAccountsService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/service_account',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: { body: createServiceAccountBodySchema },
      options: {
        access: 'internal',
        body: { maxBytes: SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES },
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const serviceAccounts = getServiceAccountsService();
        if (!serviceAccounts) {
          return response.notFound(unavailable('the feature is disabled'));
        }

        return response.ok({ body: await serviceAccounts.create(request, request.body) });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
