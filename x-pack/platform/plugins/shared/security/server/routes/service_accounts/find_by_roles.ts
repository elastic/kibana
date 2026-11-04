/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindServiceAccountsByRolesResponse } from '@kbn/core-security-common';

import { findServiceAccountsByRolesBodySchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import { withWorkloadCounts } from './workload_counts';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Finds the service accounts that hold any of the given roles, so the role management pages can
 * warn that changing a role changes those accounts too. A POST so that a long list of roles isn't
 * squeezed into a query string.
 */
export function defineFindServiceAccountsByRolesRoute({
  router,
  logger,
  getServiceAccountsService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/service_account/_find_by_roles',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the service accounts backend, which requires the `manage_security` cluster privilege',
        },
      },
      validate: { body: findServiceAccountsByRolesBodySchema },
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

        const result = await serviceAccounts.backend.findByRoles(request, request.body.roles);
        const body: FindServiceAccountsByRolesResponse = {
          ...result,
          serviceAccounts: await withWorkloadCounts(
            result.serviceAccounts,
            serviceAccounts.management,
            logger
          ),
        };
        return response.ok({ body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
