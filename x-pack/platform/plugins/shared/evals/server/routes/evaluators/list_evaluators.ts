/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, EVALS_EVALUATORS_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { z } from '@kbn/zod/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerListEvaluatorsRoute = ({ router, evaluatorRegistry }: RouteDependencies) => {
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
      async (_context, _request, response) => {
        const evaluators = evaluatorRegistry.list().map((evaluator) => ({
          name: evaluator.name,
          version: evaluator.version,
          kind: evaluator.kind,
          description: evaluator.description,
          ...(evaluator.referenceDataSchema
            ? {
                reference_data_schema: (() => {
                  const { $schema, type, ...schema } = z.toJSONSchema(
                    evaluator.referenceDataSchema,
                    { target: 'draft-7', unrepresentable: 'any' }
                  ) as Record<string, unknown>;
                  return schema;
                })(),
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
