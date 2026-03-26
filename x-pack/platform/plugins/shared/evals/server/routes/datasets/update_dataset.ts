/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_URL,
  INTERNAL_API_ACCESS,
  UpdateEvaluationDatasetRequestBody,
  UpdateEvaluationDatasetRequestParams,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerUpdateDatasetRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .put({
      path: EVALS_DATASET_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Update evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateEvaluationDatasetRequestParams),
            body: buildRouteValidationWithZod(UpdateEvaluationDatasetRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId } = request.params;
          const { description } = request.body;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const updatedDataset = await datasetClient.update(datasetId, {
            description,
          });

          if (!updatedDataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          return response.ok({
            body: {
              id: updatedDataset.id,
              name: updatedDataset.name,
              description: updatedDataset.description,
              created_at: updatedDataset.created_at,
              updated_at: updatedDataset.updated_at,
            },
          });
        } catch (error) {
          logger.error(`Failed to update evaluation dataset: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update evaluation dataset' },
          });
        }
      }
    );
};
