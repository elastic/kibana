/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export interface ApiKeyPrivilegesResponse {
  areApiKeysEnabled: boolean;
  canManageApiKeys: boolean;
  canManageOwnApiKeys: boolean;
}

export function defineApiKeyPrivilegesRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key/_privileges',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the scoped ES cluster client of the internal authentication service',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, _request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const authenticationService = getAuthenticationService();

        const [{ cluster: clusterPrivileges }, areApiKeysEnabled] = await Promise.all([
          esClient.asCurrentUser.security.hasPrivileges({
            cluster: ['manage_api_key', 'manage_own_api_key'],
          }),
          authenticationService.apiKeys.areAPIKeysEnabled(),
        ]);

        return response.ok<ApiKeyPrivilegesResponse>({
          body: {
            areApiKeysEnabled,
            canManageApiKeys: clusterPrivileges.manage_api_key,
            canManageOwnApiKeys: clusterPrivileges.manage_own_api_key,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
