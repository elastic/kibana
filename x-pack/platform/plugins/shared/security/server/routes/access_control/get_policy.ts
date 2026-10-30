/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACCESS_CONTROL_ROUTE_SECURITY,
  createAccessControlHandler,
  typeParamsSchema,
} from './common';
import type { RouteDefinitionParams } from '..';

/**
 * Returns a type's access policy and whether object-level security is enabled, so that the UI can
 * render the access panel or leave it out.
 */
export function defineGetAccessPolicyRoute(params: RouteDefinitionParams) {
  params.router.get(
    {
      path: '/internal/security/access_control/{type}/_policy',
      validate: { params: typeParamsSchema },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(
      params,
      async ({ request, response, aclService, policy, spaceId }) => {
        // Anyone who can view objects of the type can read its policy.
        const { hasAllRequested } = await params.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, { kibana: aclService.getLevelPrivilegeActions(policy, 'view') });
        if (!hasAllRequested) {
          return response.forbidden();
        }

        return response.ok({
          body: {
            enabled: aclService.isEnabled(),
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
