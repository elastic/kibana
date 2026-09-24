/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceAccountBodySchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import type { RouteDefinitionParams } from '..';
import { SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES } from '../../../common/service_accounts';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

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
            'This route delegates authorization to the service account provider: UIAM via the ' +
            "forwarded access token, or Elasticsearch via the caller's `manage_security` cluster privilege",
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
          return response.notFound(serviceAccountsUnavailable('the feature is disabled'));
        }

        return response.ok({
          body: await serviceAccounts.backend.create(request, request.body),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
