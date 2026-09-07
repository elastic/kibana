/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, EVALS_EVALUATORS_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { z } from '@kbn/zod/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const toJsonSchema = (schema: z.ZodType) => {
  const { $schema, type, ...jsonSchema } = z.toJSONSchema(schema, {
    target: 'draft-7',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return jsonSchema;
};

export const registerListEvaluatorsRoute = ({
  router,
  evaluatorRegistry,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EVALUATORS_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'List evaluator definitions',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (_context, request, response) => {
        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
        const definitions = await evaluatorRegistry.asScoped({ spaceId }).list();

        const evaluators = definitions.map((evaluator) => ({
          name: evaluator.name,
          version: evaluator.version,
          kind: evaluator.kind,
          origin: evaluator.origin,
          description: evaluator.description,
          ...(evaluator.referenceDataSchema
            ? {
                reference_data_schema: toJsonSchema(evaluator.referenceDataSchema),
              }
            : {}),
          ...(evaluator.evidenceSchema
            ? {
                evidence_schema: toJsonSchema(evaluator.evidenceSchema),
              }
            : {}),
        }));

        return response.ok({
          body: {
            evaluators,
          },
        });
      }
    );
};
