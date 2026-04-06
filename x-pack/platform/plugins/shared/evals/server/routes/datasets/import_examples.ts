/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  API_VERSIONS,
  EVALS_DATASET_IMPORT_URL,
  INTERNAL_API_ACCESS,
  MAX_EXAMPLES_PER_DATASET,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const ImportExamplesRequestParams = z.object({
  datasetId: z.string(),
});

const ImportExamplesRequestBody = z.object({
  examples: z
    .array(
      z.object({
        input: z.record(z.string(), z.unknown()).optional(),
        output: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(MAX_EXAMPLES_PER_DATASET),
  validate_schema: z.boolean().optional(),
});

const validateExampleSchema = (
  example: { input?: Record<string, unknown>; output?: Record<string, unknown> },
  referenceExample?: { input?: Record<string, unknown>; output?: Record<string, unknown> }
): string | null => {
  if (!referenceExample) {
    return null;
  }

  const refInputKeys = referenceExample.input ? Object.keys(referenceExample.input).sort() : [];
  const exInputKeys = example.input ? Object.keys(example.input).sort() : [];

  if (refInputKeys.length > 0 && exInputKeys.length > 0) {
    if (JSON.stringify(refInputKeys) !== JSON.stringify(exInputKeys)) {
      return `Input keys mismatch: expected [${refInputKeys.join(', ')}], got [${exInputKeys.join(
        ', '
      )}]`;
    }
  }

  return null;
};

export const registerImportExamplesRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_IMPORT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Bulk import examples into a dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ImportExamplesRequestParams),
            body: buildRouteValidationWithZod(ImportExamplesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId } = request.params;
          const { examples, validate_schema: validateSchema } = request.body;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);

          const dataset = await datasetClient.get(datasetId);
          if (!dataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          const existingCount = dataset.examples.length;
          if (existingCount + examples.length > MAX_EXAMPLES_PER_DATASET) {
            return response.badRequest({
              body: {
                message: `Import would exceed the maximum of ${MAX_EXAMPLES_PER_DATASET} examples per dataset. Current: ${existingCount}, importing: ${examples.length}`,
              },
            });
          }

          const errors: string[] = [];
          const validExamples: Array<{
            input?: Record<string, unknown>;
            output?: Record<string, unknown>;
            metadata?: Record<string, unknown>;
          }> = [];

          const referenceExample = dataset.examples[0];

          for (let i = 0; i < examples.length; i++) {
            const example = examples[i];

            if (validateSchema) {
              const validationError = validateExampleSchema(example, referenceExample);
              if (validationError) {
                errors.push(`Example ${i}: ${validationError}`);
                continue;
              }
            }

            validExamples.push(example);
          }

          let added = 0;
          if (validExamples.length > 0) {
            const result = await datasetClient.addExamples(datasetId, validExamples, {
              rejectDuplicates: false,
            });
            added = result.added;
          }

          return response.ok({
            body: {
              added,
              rejected: examples.length - validExamples.length,
              errors,
            },
          });
        } catch (error) {
          logger.error(`Failed to import examples: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to import examples' },
          });
        }
      }
    );
};
