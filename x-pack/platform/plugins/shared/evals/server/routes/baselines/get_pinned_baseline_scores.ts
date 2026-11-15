/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_BASELINE_SCORES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  GetPinnedBaselineScoresRequestParams,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

export const registerGetPinnedBaselineScoresRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_BASELINE_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get pinned evaluation baseline scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetPinnedBaselineScoresRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { baselineId } = request.params;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const scores = await evalsContext.pinnedBaselineService.getScores({
            baselineId,
            spaceId,
          });

          return response.ok({ body: { scores, total: scores.length } });
        } catch (error) {
          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Get pinned baseline scores',
          });
          if (tooLarge) return tooLarge;

          logger.error(`Failed to get pinned baseline scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get pinned baseline scores' },
          });
        }
      }
    );
};
