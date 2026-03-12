/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

export function defineOAuthProtectedResourceRoute({ router, config }: RouteDefinitionParams) {
  if (!config.mcp?.oauth2) {
    return;
  }

  const { metadata } = config.mcp.oauth2;

  router.get(
    {
      path: '/.well-known/oauth-protected-resource',
      security: {
        authc: {
          enabled: false,
          reason:
            'This endpoint must be publicly accessible for OAuth 2 Protected Resource Metadata discovery.',
        },
        authz: {
          enabled: false,
          reason:
            'This endpoint must be publicly accessible for OAuth 2 Protected Resource Metadata discovery.',
        },
      },
      options: { access: 'public' },
      validate: false,
    },
    (_context, _request, response) => {
      const body: Record<string, unknown> = {
        authorization_servers: metadata.authorization_servers,
        ...(metadata.resource ? { resource: metadata.resource } : {}),
        ...(metadata.bearer_methods_supported
          ? { bearer_methods_supported: metadata.bearer_methods_supported }
          : {}),
        ...(metadata.scopes_supported ? { scopes_supported: metadata.scopes_supported } : {}),
        ...(metadata.resource_documentation
          ? { resource_documentation: metadata.resource_documentation }
          : {}),
      };

      return response.ok({
        body,
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
