/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CreateEvaluationDatasetRequestBody,
  EVALS_DATASETS_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const isDatasetAlreadyExistsError = (error: unknown): boolean => {
  return error instanceof Error && error.message.includes('already exists');
};

export const registerCreateDatasetRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASETS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Create evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateEvaluationDatasetRequestBody),
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

          const dataset = await datasetClient.create(name, description, examples);

          return response.ok({
            body: {
              dataset_id: dataset.id,
              name: dataset.name,
              examples_count: dataset.examples.length,
            },
          });
        } catch (error) {
          if (isDatasetAlreadyExistsError(error)) {
            return response.customError({
              statusCode: 409,
              body: { message: error.message },
            });
          }

          logger.error(`Failed to create evaluation dataset: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to create evaluation dataset' },
          });
        }
      }
    );
};
