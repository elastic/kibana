/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  DeleteEvaluationDatasetRequestParams,
  EVALS_DATASET_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerDeleteDatasetRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .delete({
      path: EVALS_DATASET_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Delete evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteEvaluationDatasetRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId } = request.params;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const wasDeleted = await datasetClient.delete(datasetId);

          if (!wasDeleted) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          return response.ok({
            body: {
              success: true,
            },
          });
        } catch (error) {
          logger.error(`Failed to delete evaluation dataset: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete evaluation dataset' },
          });
        }
      }
    );
};
