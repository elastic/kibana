/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOlsHandler, OLS_ROUTE_SECURITY, typeParamsSchema } from './common';
import type { RouteDefinitionParams } from '../..';

/**
 * Returns a type's access policy and whether object-level security is enabled, so that the UI can
 * render the access panel or leave it out.
 */
export function defineGetAccessPolicyRoute(params: RouteDefinitionParams) {
  params.router.get(
    {
      path: '/internal/security/ols/{type}/_policy',
      validate: { params: typeParamsSchema },
      security: OLS_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createOlsHandler(
      params,
      async ({ request, response, olsService, policy, spaceId }) => {
        // Anyone who can view objects of the type can read its policy.
        const { hasAllRequested } = await params.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, { kibana: olsService.getLevelPrivilegeActions(policy, 'view') });
        if (!hasAllRequested) {
          return response.forbidden();
        }

        return response.ok({
          body: {
            enabled: olsService.isEnabled(),
            general_access: policy.generalAccess,
            entry_levels: policy.entryLevels,
            operations: Object.fromEntries(
              Object.entries(policy.operations).map(([name, { level }]) => [name, { level }])
            ),
          },
        });
      },
      { allowDisabled: true }
    )
  );
}
