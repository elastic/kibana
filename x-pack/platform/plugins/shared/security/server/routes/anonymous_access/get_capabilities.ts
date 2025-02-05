/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

/**
 * Defines route that returns capabilities of the anonymous service account.
 */
export function defineAnonymousAccessGetCapabilitiesRoutes({
  router,
  getAnonymousAccessService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/anonymous_access/capabilities',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the scoped ES cluster client of the anonymous access service',
        },
      },
      validate: false,
    },
    async (_context, request, response) => {
      const anonymousAccessService = getAnonymousAccessService();
      return response.ok({ body: await anonymousAccessService.getCapabilities(request) });
    }
  );
}
