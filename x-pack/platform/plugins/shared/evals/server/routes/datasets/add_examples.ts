/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  AddEvaluationDatasetExamplesRequestBody,
  AddEvaluationDatasetExamplesRequestParams,
  EVALS_DATASET_EXAMPLES_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { ExampleAlreadyExistsError } from '../../storage/example_already_exists_error';
import type { RouteDependencies } from '../register_routes';

export const registerAddExamplesRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_EXAMPLES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Add examples to evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(AddEvaluationDatasetExamplesRequestParams),
            body: buildRouteValidationWithZod(AddEvaluationDatasetExamplesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId } = request.params;
          const { examples } = request.body;
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

          const { added } = await datasetClient.addExamples(datasetId, examples);

          return response.ok({
            body: {
              added,
            },
          });
        } catch (error) {
          if (error instanceof ExampleAlreadyExistsError) {
            return response.customError({
              statusCode: 409,
              body: { message: error.message },
            });
          }

          logger.error(`Failed to add evaluation dataset examples: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to add evaluation dataset examples' },
          });
        }
      }
    );
};
