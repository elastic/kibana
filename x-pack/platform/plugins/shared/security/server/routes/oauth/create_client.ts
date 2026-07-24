/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClientBodySchema } from './schemas';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineCreateOAuthClientRoute({
  router,
  config,
  getAuthenticationService,
  serverlessProjectId,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/oauth/clients',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        body: createClientBodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const { oauth } = getAuthenticationService();
        if (!oauth) {
          return response.notFound({
            body: { message: 'OAuth management is not available: UIAM is not configured' },
          });
        }

        const resource = config.mcp?.oauth2?.metadata?.resource;
        if (!resource) {
          return response.notFound({
            body: {
              message:
                'OAuth management is not available: MCP protected resource metadata is not configured',
            },
          });
        }

        // UIAM requires the project the client belongs to. It is always available on serverless
        if (!serverlessProjectId) {
          return response.notFound({
            body: {
              message: 'OAuth management is not available: serverless project id is not configured',
            },
          });
        }

        const result = await oauth.createClient(request, {
          ...request.body,
          resource,
          project_id: serverlessProjectId,
        });
        if (!result) {
          return response.notFound({
            body: {
              message: 'OAuth management is not available: security features are disabled',
            },
          });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
