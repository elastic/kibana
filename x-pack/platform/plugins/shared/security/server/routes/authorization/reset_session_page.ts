/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

export function resetSessionPageRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/internal/security/reset_session_page.js',
      validate: false,
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authentication because it is a host for reset session page.',
        },
        authc: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it is a host for reset session page.',
        },
      },
    },
    (context, request, response) => {
      return response.renderJs({
        body: `
          document.addEventListener('DOMContentLoaded', function(event) {
            document.getElementById('goBackButton').onclick = function() {
              window.history.back();
            }
          })
        `,
      });
    }
  );
}
