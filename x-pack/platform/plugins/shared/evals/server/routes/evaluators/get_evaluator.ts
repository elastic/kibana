/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { EvaluatorClient } from '../../storage/evaluator_client';
import type { EvaluatorRouteDependencies } from '.';

const EVALS_EVALUATOR_URL = `${EVALS_INTERNAL_URL}/evaluators/{evaluatorId}` as const;

const GetEvaluatorRequestParams = z.object({
  evaluatorId: z.string(),
});

export const registerGetEvaluatorRoute = ({
  router,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EVALUATOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get evaluator by ID',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluatorRequestParams),
          },
        },
      },
      async (context, request, response) => {
        const { evaluatorId } = request.params;
        const evaluator = evaluatorRegistry.get(evaluatorId);

        if (!evaluator) {
          return response.notFound({
            body: { message: `Evaluator not found: ${evaluatorId}` },
          });
        }

        if (evaluator.source === 'custom') {
          try {
            const coreContext = await context.core;
            const soClient = coreContext.savedObjects.client;
            const evaluatorClient = new EvaluatorClient(soClient);
            const so = await evaluatorClient.get(evaluatorId);

            return response.ok({
              body: {
                id: so.id,
                name: so.attributes.name,
                kind: so.attributes.kind,
                type: so.attributes.type,
                description: so.attributes.description,
                source: 'custom',
                config: so.attributes.config,
                version: so.attributes.version,
                versions: [],
                tags: so.attributes.tags,
                shared: so.attributes.shared,
                usage_count: 0,
                created_at: so.attributes.created_at,
                updated_at: so.attributes.updated_at,
              },
            });
          } catch (_error) {
            // Fall through to basic response if SO not found
          }
        }

        const now = new Date().toISOString();
        return response.ok({
          body: {
            id: evaluator.name,
            name: evaluator.name,
            kind: evaluator.kind,
            type: evaluator.source === 'prebuilt' ? 'prebuilt' : 'code',
            description: evaluator.description,
            source: evaluator.source,
            config: null,
            versions: [],
            tags: [],
            usage_count: 0,
            version: 1,
            created_at: now,
            updated_at: now,
          },
        });
      }
    );
};
