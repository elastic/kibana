/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASETS_URL,
  GetEvaluationDatasetsRequestQuery,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerListDatasetsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_DATASETS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List evaluation datasets',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetEvaluationDatasetsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { page, per_page: perPage } = request.query;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const datasets = await datasetClient.list({ page, perPage });

          return response.ok({
            body: datasets,
          });
        } catch (error) {
          logger.error(`Failed to list evaluation datasets: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list evaluation datasets' },
          });
        }
      }
    );
};
