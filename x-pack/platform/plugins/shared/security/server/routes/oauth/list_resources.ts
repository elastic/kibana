/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import type { ConfigType } from '../../config';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export interface OAuthResource {
  value: string;
  label: string;
}

/** Returns the configured OAuth resources, or null when MCP is not configured. */
export function getConfiguredOAuthResources(config: ConfigType): OAuthResource[] | null {
  const mcpResource = config.mcp?.oauth2?.metadata?.resource;
  if (!mcpResource) {
    return null;
  }
  const a2aResource = config.a2a?.oauth2?.metadata?.resource;
  return [
    { value: mcpResource, label: 'MCP Server' },
    ...(a2aResource ? [{ value: a2aResource, label: 'A2A Agent' }] : []),
  ];
}

export function defineListOAuthResourcesRoute({ router, config }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/oauth/resources',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (_context, _request, response) => {
      try {
        const resources = getConfiguredOAuthResources(config);
        if (!resources) {
          return response.notFound({
            body: {
              message:
                'OAuth management is not available: MCP protected resource metadata is not configured',
            },
          });
        }
        return response.ok({ body: { resources } });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
