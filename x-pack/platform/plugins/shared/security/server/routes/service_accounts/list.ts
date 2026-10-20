/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { listServiceAccountsQuerySchema } from './schemas';
import { serviceAccountsUnavailable } from './unavailable';
import type { RouteDefinitionParams } from '..';
import type { ListServiceAccountsResponse } from '../../../common/service_accounts';
import { getDetailedErrorMessage, wrapIntoCustomErrorResponse } from '../../errors';
import type { ServiceAccountsManagementApi } from '../../service_accounts';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Adds the number of bound workloads to each account. A failed count doesn't fail the list: the
 * accounts come back without counts instead.
 */
const withWorkloadCounts = async (
  page: ListServiceAccountsResponse,
  management: ServiceAccountsManagementApi,
  logger: Logger
): Promise<ListServiceAccountsResponse> => {
  const ids = page.serviceAccounts.map(({ id }) => id);
  try {
    const counts = await management.countBoundWorkloads(ids);
    return {
      ...page,
      serviceAccounts: page.serviceAccounts.map((account) => ({
        ...account,
        workloadCount: counts.get(account.id) ?? 0,
      })),
    };
  } catch (error) {
    logger.warn(
      `Unable to count the workloads bound to ${
        ids.length
      } service account(s): ${getDetailedErrorMessage(error)}`
    );
    return page;
  }
};

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
        return response.ok({
          body: await withWorkloadCounts(page, serviceAccounts.management, logger),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
