/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCreateServiceAccountBodySchema,
  getCreateServiceAccountMaxBodyBytes,
  getServiceAccountRoleLimits,
} from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineCreateServiceAccountRoute({
  router,
  getServiceAccountsService,
  buildFlavor,
}: RouteDefinitionParams) {
  // The route has authorization disabled, so the body is parsed before the backend's privilege
  // check runs. Holding it to the active backend's limits keeps that parse as small as it can be.
  const roleLimits = getServiceAccountRoleLimits(buildFlavor);

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
      validate: { body: getCreateServiceAccountBodySchema(roleLimits) },
      options: {
        access: 'internal',
        body: { maxBytes: getCreateServiceAccountMaxBodyBytes(roleLimits) },
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
