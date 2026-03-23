/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  DeleteEvaluationDatasetExampleRequestParams,
  EVALS_DATASET_EXAMPLE_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerDeleteExampleRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .delete({
      path: EVALS_DATASET_EXAMPLE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Delete evaluation dataset example',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteEvaluationDatasetExampleRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId, exampleId } = request.params;
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

          if (!dataset.examples.some((example) => example.id === exampleId)) {
            return response.notFound({
              body: { message: `Evaluation dataset example not found: ${exampleId}` },
            });
          }

          const wasDeleted = await datasetClient.deleteExample(exampleId);
          if (!wasDeleted) {
            return response.notFound({
              body: { message: `Evaluation dataset example not found: ${exampleId}` },
            });
          }

          return response.ok({
            body: {
              success: true,
            },
          });
        } catch (error) {
          logger.error(`Failed to delete evaluation dataset example: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete evaluation dataset example' },
          });
        }
      }
    );
};
