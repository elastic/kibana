/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { withOAuthManagementGate } from './with_oauth_management_gate';
import type { RouteDefinitionParams } from '..';
import { OAUTH_MAX_STRING_FIELD_LENGTH } from '../../../common/oauth/constants';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineListOAuthClientsRoute({
  router,
  getAuthenticationService,
  serverlessProjectId,
}: RouteDefinitionParams) {
  router.get(
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
        query: schema.object({
          client_id: schema.maybe(
            schema.string({ minLength: 1, maxLength: OAUTH_MAX_STRING_FIELD_LENGTH })
          ),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    withOAuthManagementGate(
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const { oauth } = getAuthenticationService();
          if (!oauth) {
            return response.notFound({
              body: { message: 'OAuth management is not available: UIAM is not configured' },
            });
          }

          const result = await oauth.listClients(
            request,
            request.query.client_id,
            serverlessProjectId
          );
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
    )
  );
}
