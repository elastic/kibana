/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Reset Session view.
 */
export function defineResetSessionRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/security/reset_session',
      validate: {
        query: schema.object({
          next: schema.maybe(schema.string())
        }),
      },
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it is used for anonymous access.',
        },
        authc: {
          enabled: false,
          reason:
            'This route is opted out from authentication because it is used for anonymous access.',
        },
      },
    },
    (context, request, response) => {
      // Check if request has an sid cookie, if not redirect to the home page
      const cookies = Array.isArray(request.headers.cookie) ? request.headers.cookie : [request.headers.cookie || ''];
      if (!cookies.find(c => c.includes('sid='))) {
        const next = request.query.next ? `?next=${encodeURIComponent(request.query.next)}` : '';
        return response.redirected({
          headers: {
            location: `/app/home${next}`,
          },
        });
      }
      return response.renderAnonymousCoreApp();
    }
  );
}
