/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../../../services';
import type { RouteDependencies } from '../../../types';

export const registerGetFollowerInfoRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/follower_info'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {},
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const body = await client.asCurrentUser.ccr.followInfo({
          index: '_all',
        });

        return response.ok({
          body,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
