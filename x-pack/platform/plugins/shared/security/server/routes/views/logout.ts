/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Logout out view.
 */
export function defineLogoutRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/logout',
      validate: false,
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it is a host for the logout view.',
        },
        authc: {
          enabled: false,
          reason:
            'This route is opted out from authentication because it is a host for the logout view.',
        },
      },
    },
    (context, request, response) => response.renderAnonymousCoreApp()
  );
}
