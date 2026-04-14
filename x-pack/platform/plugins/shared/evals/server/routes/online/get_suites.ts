/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetOnlineSuitesRoute = ({
  router,
  onlineSuiteRegistry,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: '/internal/evals/online/suites',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List online evaluation suites',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (_context, _request, response) => {
        return response.ok({
          body: {
            suites: onlineSuiteRegistry?.list() ?? [],
          },
        });
      }
    );
};
