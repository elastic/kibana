/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Logged Out view.
 */
export function defineLoggedOutRoutes({
  logger,
  getSession,
  httpResources,
  basePath,
}: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/security/logged_out',
      validate: false,
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it is a host for the logged out view.',
        },
        authc: {
          enabled: false,
          reason:
            'This route is opted out from authentication because it is a host for the logged out view.',
        },
      },
    },
    async (context, request, response) => {
      // Authentication flow isn't triggered automatically for this route, so we should explicitly
      // check whether user has an active session already.
      const isUserAlreadyLoggedIn = (await getSession().get(request)).value !== null;
      if (isUserAlreadyLoggedIn) {
        logger.debug('User is already authenticated, redirecting...');
        return response.redirected({
          headers: { location: `${basePath.serverBasePath}/` },
        });
      }

      return response.renderAnonymousCoreApp();
    }
  );
}
