/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listServiceAccountsQuerySchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import { withWorkloadCounts } from './workload_counts';
import type { RouteDefinitionParams } from '..';
import type { ListServiceAccountsResponse } from '../../../common/service_accounts';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineListServiceAccountsRoute({
  router,
  logger,
  getServiceAccountsService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/service_account',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the service accounts backend, which requires the `manage_security` cluster privilege',
        },
      },
      validate: { query: listServiceAccountsQuerySchema },
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

        const page = await serviceAccounts.backend.list(request, request.query);
        const body: ListServiceAccountsResponse = {
          ...page,
          serviceAccounts: await withWorkloadCounts(
            page.serviceAccounts,
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
