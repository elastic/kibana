/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_UPSERT_URL,
  INTERNAL_API_ACCESS,
  UpsertEvaluationDatasetRequestBody,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerUpsertDatasetRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_UPSERT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Upsert evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(UpsertEvaluationDatasetRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { name, description, examples } = request.body;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const upsertResult = await datasetClient.upsert(name, description, examples);

          return response.ok({
            body: upsertResult,
          });
        } catch (error) {
          logger.error(`Failed to upsert evaluation dataset: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to upsert evaluation dataset' },
          });
        }
      }
    );
};
