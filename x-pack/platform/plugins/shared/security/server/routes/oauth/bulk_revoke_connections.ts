/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import {
  OAUTH_MAX_BULK_REVOKE_CONNECTIONS,
  OAUTH_MAX_STRING_FIELD_LENGTH,
} from '../../../common/oauth/constants';
import { wrapError, wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

interface BulkRevokeOAuthConnectionResultItem {
  client_id: string;
  connection_id: string;
  status: 'revoked' | 'error';
  status_code?: number;
  message?: string;
}

interface BulkRevokeOAuthConnectionsResponseBody {
  results: BulkRevokeOAuthConnectionResultItem[];
}

export function defineBulkRevokeOAuthConnectionsRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/oauth/connections/_bulk_revoke',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        body: schema.object({
          connections: schema.arrayOf(
            schema.object({
              client_id: schema.string({
                minLength: 1,
                maxLength: OAUTH_MAX_STRING_FIELD_LENGTH,
              }),
              connection_id: schema.string({
                minLength: 1,
                maxLength: OAUTH_MAX_STRING_FIELD_LENGTH,
              }),
            }),
            { minSize: 1, maxSize: OAUTH_MAX_BULK_REVOKE_CONNECTIONS }
          ),
          reason: schema.maybe(schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH })),
        }),
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

        const { connections, reason } = request.body;

        const settled = await Promise.allSettled(
          connections.map(({ client_id: clientId, connection_id: connectionId }) =>
            oauth.revokeConnection(request, clientId, connectionId, reason)
          )
        );

        const allUnavailable = settled.every(
          (result) => result.status === 'fulfilled' && result.value === null
        );
        if (allUnavailable) {
          return response.notFound({
            body: {
              message: 'OAuth management is not available: security features are disabled',
            },
          });
        }

        const results: BulkRevokeOAuthConnectionResultItem[] = settled.map(
          (settledResult, index) => {
            const { client_id: clientId, connection_id: connectionId } = connections[index];

            if (settledResult.status === 'fulfilled') {
              if (settledResult.value === null) {
                return {
                  client_id: clientId,
                  connection_id: connectionId,
                  status: 'error',
                  status_code: 404,
                  message: 'OAuth management is not available: security features are disabled',
                };
              }
              return { client_id: clientId, connection_id: connectionId, status: 'revoked' };
            }

            const wrapped = wrapError(settledResult.reason);
            return {
              client_id: clientId,
              connection_id: connectionId,
              status: 'error',
              status_code: wrapped.output.statusCode,
              message: wrapped.output.payload.message,
            };
          }
        );

        const body: BulkRevokeOAuthConnectionsResponseBody = { results };
        return response.ok({ body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
