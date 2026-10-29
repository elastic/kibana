/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_BASELINES_LATEST_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  GetLatestPinnedBaselineRequestQuery,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetLatestPinnedBaselineRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_BASELINES_LATEST_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get the latest pinned evaluation baseline',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetLatestPinnedBaselineRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { suite_id: suiteId, model_id: modelId } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const baseline = await evalsContext.pinnedBaselineService.findLatest({
            suiteId,
            modelId,
            spaceId,
          });

          return response.ok({ body: { baseline: baseline ?? null } });
        } catch (error) {
          logger.error(`Failed to get latest pinned baseline: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get latest pinned baseline' },
          });
        }
      }
    );
};
