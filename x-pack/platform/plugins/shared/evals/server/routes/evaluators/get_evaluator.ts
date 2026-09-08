/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EVALUATOR_URL,
  GetEvaluatorRequestParams,
  GetEvaluatorRequestQuery,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { EvaluatorNotFoundError } from '../../storage/evaluators/evaluator_not_found_error';
import type { RouteDependencies } from '../register_routes';
import { handleEvaluatorError } from './shared/handle_evaluator_error';
import { toPersistedEvaluatorResponse } from './shared/to_persisted_evaluator';

export const registerGetEvaluatorRoute = ({
  router,
  logger,
  getSpaceId,
  evaluatorRegistry,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EVALUATOR_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluator',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluatorRequestParams),
            query: buildRouteValidationWithZod(GetEvaluatorRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const { name } = request.params;
        const { version } = request.query;

        try {
          if (evaluatorRegistry.isBuiltIn(name)) {
            const builtIn = await evaluatorRegistry
              .asScoped({ spaceId: DEFAULT_SPACE_ID })
              .get(name, version);

            if (!builtIn) {
              throw new EvaluatorNotFoundError(name, version);
            }

            return response.ok({
              body: {
                evaluator: {
                  name: builtIn.name,
                  version: builtIn.version,
                  kind: builtIn.kind,
                  origin: builtIn.origin,
                  description: builtIn.description,
                },
              },
            });
          }

          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const { evaluatorDefinitionService } = await context.evals;
          const client = evaluatorDefinitionService.getClient({ spaceId });

          const versions = await client.listVersions(name);
          const evaluator = version ? await client.getVersion(name, version) : versions[0];

          if (!evaluator) {
            throw new EvaluatorNotFoundError(name, version);
          }

          return response.ok({
            body: {
              evaluator: {
                ...toPersistedEvaluatorResponse(evaluator),
                versions: versions.map((candidate) => candidate.version),
              },
            },
          });
        } catch (error) {
          return handleEvaluatorError({
            error,
            response,
            logger,
            fallbackMessage: 'Failed to get evaluator',
          });
        }
      }
    );
};
