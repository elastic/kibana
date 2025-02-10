/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Account Management view.
 */
export function defineAccountManagementRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/security/account',
      validate: false,
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it a host for the account management view.',
        },
      },
    },
    (context, req, res) => res.renderCoreApp()
  );
}
