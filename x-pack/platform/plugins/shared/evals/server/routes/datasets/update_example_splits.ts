/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  API_VERSIONS,
  EVALS_DATASET_EXAMPLE_SPLITS_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const UpdateExampleSplitsRequestParams = z.object({
  datasetId: z.string(),
  exampleId: z.string(),
});

const UpdateExampleSplitsRequestBody = z.object({
  splits: z.array(z.string().min(1)).min(1),
});

export const registerUpdateExampleSplitsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .put({
      path: EVALS_DATASET_EXAMPLE_SPLITS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Update splits for a dataset example',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateExampleSplitsRequestParams),
            body: buildRouteValidationWithZod(UpdateExampleSplitsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { datasetId, exampleId } = request.params;
          const { splits } = request.body;
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

          const example = dataset.examples.find((e) => e.id === exampleId);
          if (!example) {
            return response.notFound({
              body: { message: `Evaluation dataset example not found: ${exampleId}` },
            });
          }

          const updatedMetadata = {
            ...(example.metadata ?? {}),
            splits,
          };

          const updated = await datasetClient.updateExample(exampleId, {
            metadata: updatedMetadata,
          });

          if (!updated) {
            return response.notFound({
              body: { message: `Evaluation dataset example not found: ${exampleId}` },
            });
          }

          return response.ok({
            body: {
              id: updated.id,
              splits,
            },
          });
        } catch (error) {
          logger.error(`Failed to update example splits: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update example splits' },
          });
        }
      }
    );
};
