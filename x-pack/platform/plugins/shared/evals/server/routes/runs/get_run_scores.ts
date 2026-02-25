/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  EVALS_RUN_SCORES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetRunScoresRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUN_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get evaluation run scores',
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

          const searchResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            query,
            sort: [
              { 'example.dataset.name': { order: 'asc' as const } },
              { 'example.index': { order: 'asc' as const } },
              { 'evaluator.name': { order: 'asc' as const } },
              { 'task.repetition_index': { order: 'asc' as const } },
            ],
            size: 10000,
          });

          const hits = searchResponse.hits?.hits ?? [];
          const scores = hits
            .map((hit) => hit._source)
            .filter((source): source is Record<string, unknown> => source !== undefined);

          return response.ok({
            body: { scores, total: scores.length },
          });
        } catch (error) {
          logger.error(`Failed to get evaluation run scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to get evaluation run scores: ${error}` },
          });
        }
      }
    );
};
