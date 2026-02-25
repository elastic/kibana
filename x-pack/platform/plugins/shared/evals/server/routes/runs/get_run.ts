/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  EVALS_RUN_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetRunRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUN_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get evaluation run detail',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              runId: schema.string(),
            }),
            query: schema.object({
              suite_id: schema.maybe(schema.string()),
              model_id: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { runId } = request.params;
          const { suite_id: suiteId, model_id: modelId } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const must: Array<Record<string, unknown>> = [{ term: { run_id: runId } }];
          if (suiteId) {
            must.push({ term: { 'suite.id': suiteId } });
          }
          if (modelId) {
            must.push({ term: { 'task.model.id': modelId } });
          }
          const query = { bool: { must } };

          const metadataResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            query,
            size: 1,
          });

          const firstDoc = metadataResponse.hits?.hits[0]?._source as
            | Record<string, any>
            | undefined;
          if (!firstDoc) {
            return response.notFound({ body: { message: `Run not found: ${runId}` } });
          }

          const aggResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            size: 0,
            query,
            aggs: {
              by_dataset: {
                terms: { field: 'example.dataset.id', size: 10000 },
                aggs: {
                  dataset_name: { terms: { field: 'example.dataset.name', size: 1 } },
                  by_evaluator: {
                    terms: { field: 'evaluator.name', size: 1000 },
                    aggs: {
                      score_stats: { extended_stats: { field: 'evaluator.score' } },
                      score_median: { percentiles: { field: 'evaluator.score', percents: [50] } },
                    },
                  },
                },
              },
            },
          });

          const aggregations = aggResponse.aggregations as Record<string, any> | undefined;
          const datasetBuckets: any[] = aggregations?.by_dataset?.buckets ?? [];

          const stats = datasetBuckets.flatMap((datasetBucket: any) => {
            const datasetId = datasetBucket.key;
            const datasetName = datasetBucket.dataset_name?.buckets?.[0]?.key ?? datasetId;
            const evaluatorBuckets: any[] = datasetBucket.by_evaluator?.buckets ?? [];

            return evaluatorBuckets.map((evaluatorBucket: any) => {
              const scoreStats = evaluatorBucket.score_stats;
              const median = evaluatorBucket.score_median?.values?.['50.0'];

              return {
                dataset_id: datasetId,
                dataset_name: datasetName,
                evaluator_name: evaluatorBucket.key,
                stats: {
                  mean: scoreStats?.avg ?? 0,
                  median: median ?? 0,
                  std_dev: scoreStats?.std_deviation ?? 0,
                  min: scoreStats?.min ?? 0,
                  max: scoreStats?.max ?? 0,
                  count: scoreStats?.count ?? 0,
                },
              };
            });
          });

          const buildModelDisplay = (model?: Record<string, unknown>) => {
            if (!model) return undefined;
            const { id, family, provider } = model as {
              id?: string;
              family?: string;
              provider?: string;
            };
            return {
              id:
                id ??
                (family && provider ? `${provider}/${family}` : family ?? provider ?? 'unknown'),
              family,
              provider,
            };
          };

          return response.ok({
            body: {
              run_id: runId,
              task_model: buildModelDisplay(firstDoc.task?.model),
              evaluator_model: buildModelDisplay(firstDoc.evaluator?.model),
              total_repetitions: firstDoc.run_metadata?.total_repetitions ?? 1,
              stats,
            },
          });
        } catch (error) {
          logger.error(`Failed to get evaluation run: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to get evaluation run: ${error}` },
          });
        }
      }
    );
};
