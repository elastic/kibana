/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  API_VERSIONS,
  EVALS_DATASET_STATS_URL,
  INTERNAL_API_ACCESS,
  buildRouteValidationWithZod,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const GetDatasetStatsRequestParams = z.object({
  datasetId: z.string(),
});

export const registerGetDatasetStatsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_DATASET_STATS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get dataset statistics',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetDatasetStatsRequestParams),
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

          const dataset = await datasetClient.get(datasetId);
          if (!dataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          const splitDistribution: Record<string, number> = {};
          for (const example of dataset.examples) {
            const exampleMeta = example.metadata as Record<string, unknown> | undefined;
            const rawSplits = Array.isArray(exampleMeta?.splits) ? exampleMeta.splits : ['default'];
            const splits = rawSplits.filter((s): s is string => typeof s === 'string');
            if (splits.length === 0) splits.push('default');
            for (const split of splits) {
              splitDistribution[split] = (splitDistribution[split] ?? 0) + 1;
            }
          }

          const versions = dataset.versions ?? [];

          return response.ok({
            body: {
              total_examples: dataset.examples.length,
              split_distribution: splitDistribution,
              version_count: versions.length,
              created_at: dataset.created_at,
              updated_at: dataset.updated_at,
            },
          });
        } catch (error) {
          logger.error(`Failed to get dataset stats: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get dataset stats' },
          });
        }
      }
    );
};
