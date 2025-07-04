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

export function defineBulkGetUserProfilesRoute({
  router,
  getUserProfileService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/user_profile/_bulk_get',
      validate: {
        body: schema.object({
          uids: schema.arrayOf(schema.string(), { minSize: 1 }),
          dataPath: schema.maybe(schema.string()),
        }),
      },
      security: {
        authz: {
          requiredPrivileges: ['bulkGetUserProfiles'],
        },
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const userProfileServiceInternal = getUserProfileService();
      try {
        const profiles = await userProfileServiceInternal.bulkGet({
          uids: new Set(request.body.uids),
          dataPath: request.body.dataPath,
        });
        return response.ok({ body: profiles });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
