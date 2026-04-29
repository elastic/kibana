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

  const authcReason =
    'This endpoint must be publicly accessible for OAuth 2 Protected Resource Metadata discovery.';
  const securityConfig = {
    authc: { enabled: false as const, reason: authcReason },
    authz: { enabled: false as const, reason: authcReason },
  };

  // https://datatracker.ietf.org/doc/html/rfc9728#section-2
  // Only resource is required by the specification and authorization_servers must be present for our UIAM OAuth implementation.
  const metadataBody: Record<string, unknown> = {
    authorization_servers: metadata.authorization_servers,
    resource: metadata.resource,
    ...(metadata.bearer_methods_supported
      ? { bearer_methods_supported: metadata.bearer_methods_supported }
      : {}),
    ...(metadata.scopes_supported ? { scopes_supported: metadata.scopes_supported } : {}),
    ...(metadata.resource_documentation
      ? { resource_documentation: metadata.resource_documentation }
      : {}),
  };

  router.get(
    {
      path: '/.well-known/oauth-protected-resource',
      security: securityConfig,
      options: { access: 'public' },
      validate: false,
    },
    (_context, _request, response) => {
      return response.ok({
        body: metadataBody,
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  // MCP Client tries path-aware discovery first (e.g.,
  // /.well-known/oauth-protected-resource/api/agent_builder/mcp) before falling
  // back to the root URL. Without this catch-all, the path-aware URL hits Kibana's
  // auth middleware and redirects to the login page (302 → 200 HTML), which the SDK
  // treats as a successful response and tries to parse as JSON, causing a failure.
  // https://datatracker.ietf.org/doc/html/rfc8414#section-3.1
  router.get(
    {
      path: '/.well-known/oauth-protected-resource/{path*}',
      security: securityConfig,
      options: { access: 'public' },
      validate: false,
    },
    (_context, _request, response) => {
      return response.ok({
        body: metadataBody,
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
