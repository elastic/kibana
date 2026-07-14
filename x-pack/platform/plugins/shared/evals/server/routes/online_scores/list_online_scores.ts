/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_URL,
  INTERNAL_API_ACCESS,
  ListOnlineScoresRequestQuery,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerListOnlineScoresRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_ONLINE_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'List online evaluation scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListOnlineScoresRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const evalsContext = await context.evals;
          const result = await evalsContext.onlineScoreService.list({
            monitorId: request.query.monitor_id,
            page: request.query.page,
            perPage: request.query.per_page,
          });

          return response.ok({
            body: result,
          });
        } catch (error) {
          logger.error(`Failed to list online evaluation scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list online evaluation scores' },
          });
        }
      }
    );
};
