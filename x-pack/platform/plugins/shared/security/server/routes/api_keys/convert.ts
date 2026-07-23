/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

// TEMPORARY DEV-ONLY: exposes UIAM api-key `_convert` from Dev Tools for manual
// verification (does a converted essu_ key's _authenticate return the creator's
// Cloud user id?). Authz is intentionally disabled. REVERT BEFORE MERGE.
export function defineConvertApiKeyRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/_convert',
      security: {
        authz: {
          enabled: false,
          reason: 'TEMPORARY DEV-ONLY endpoint for manual UIAM key conversion testing.',
        },
      },
      validate: {
        body: schema.object({
          keys: schema.arrayOf(schema.string(), { minSize: 1 }),
        }),
      },
      options: { access: 'internal' },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const uiam = getAuthenticationService().apiKeys.uiam;
        if (!uiam) {
          return response.badRequest({ body: { message: 'UIAM API keys are not available' } });
        }

        const result = await uiam.convert(request.body.keys);
        if (!result) {
          return response.badRequest({ body: { message: 'API Keys are not available' } });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
