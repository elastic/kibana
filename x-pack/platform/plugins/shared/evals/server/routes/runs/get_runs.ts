/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  EVALS_RUNS_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetRunsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUNS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List evaluation runs',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: schema.object({
              suite_id: schema.maybe(schema.string()),
              model_id: schema.maybe(schema.string()),
              branch: schema.maybe(schema.string()),
              page: schema.number({ defaultValue: 1, min: 1 }),
              per_page: schema.number({ defaultValue: 25, min: 1, max: 100 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            suite_id: suiteId,
            model_id: modelId,
            branch,
            page: _page,
            per_page: perPage,
          } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const filters: Array<Record<string, unknown>> = [];
          if (suiteId) {
            filters.push({ term: { 'suite.id': suiteId } });
          }
          if (modelId) {
            filters.push({ term: { 'task.model.id': modelId } });
          }
          if (branch) {
            filters.push({ term: { 'run_metadata.git_branch': branch } });
          }

          const query = filters.length > 0 ? { bool: { filter: filters } } : { match_all: {} };

          const aggResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            size: 0,
            query,
            aggs: {
              total_runs: {
                cardinality: { field: 'run_id' },
              },
              runs: {
                terms: {
                  field: 'run_id',
                  size: perPage,
                  order: { latest_timestamp: 'desc' },
                },
                aggs: {
                  latest_timestamp: { max: { field: '@timestamp' } },
                  suite_id: { terms: { field: 'suite.id', size: 1 } },
                  task_model_id: { terms: { field: 'task.model.id', size: 1 } },
                  task_model_family: { terms: { field: 'task.model.family', size: 1 } },
                  task_model_provider: { terms: { field: 'task.model.provider', size: 1 } },
                  evaluator_model_id: { terms: { field: 'evaluator.model.id', size: 1 } },
                  evaluator_model_family: { terms: { field: 'evaluator.model.family', size: 1 } },
                  evaluator_model_provider: {
                    terms: { field: 'evaluator.model.provider', size: 1 },
                  },
                  git_branch: { terms: { field: 'run_metadata.git_branch', size: 1 } },
                  git_commit_sha: { terms: { field: 'run_metadata.git_commit_sha', size: 1 } },
                  total_repetitions: { max: { field: 'run_metadata.total_repetitions' } },
                  build_url: { terms: { field: 'ci.buildkite.build_url', size: 1 } },
                },
              },
            },
          });

          const aggs = aggResponse.aggregations as Record<string, any> | undefined;
          const totalRuns = aggs?.total_runs?.value ?? 0;
          const runBuckets: any[] = aggs?.runs?.buckets ?? [];

          const firstBucket = (agg: any): string | undefined => agg?.buckets?.[0]?.key;

          const buildModelId = (id?: string, family?: string, provider?: string): string => {
            if (id) return id;
            if (family && provider) return `${provider}/${family}`;
            return family ?? provider ?? 'unknown';
          };

          const runs = runBuckets.map((bucket: any) => {
            const taskFamily = firstBucket(bucket.task_model_family);
            const taskProvider = firstBucket(bucket.task_model_provider);
            const evalFamily = firstBucket(bucket.evaluator_model_family);
            const evalProvider = firstBucket(bucket.evaluator_model_provider);

            return {
              run_id: bucket.key,
              timestamp: bucket.latest_timestamp?.value_as_string,
              suite_id: firstBucket(bucket.suite_id),
              task_model: {
                id: buildModelId(firstBucket(bucket.task_model_id), taskFamily, taskProvider),
                family: taskFamily,
                provider: taskProvider,
              },
              evaluator_model: {
                id: buildModelId(firstBucket(bucket.evaluator_model_id), evalFamily, evalProvider),
                family: evalFamily,
                provider: evalProvider,
              },
              git_branch: firstBucket(bucket.git_branch) ?? null,
              git_commit_sha: firstBucket(bucket.git_commit_sha) ?? null,
              total_scores: bucket.doc_count,
              total_repetitions: bucket.total_repetitions?.value ?? 1,
              ci: {
                build_url: firstBucket(bucket.build_url),
              },
            };
          });

          return response.ok({
            body: { runs, total: totalRuns },
          });
        } catch (error) {
          logger.error(`Failed to list evaluation runs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to list evaluation runs: ${error}` },
          });
        }
      }
    );
};
