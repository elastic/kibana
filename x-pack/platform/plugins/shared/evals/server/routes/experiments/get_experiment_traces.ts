/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_TRACES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  TRACES_INDEX_PATTERN,
  buildExperimentFilterQuery,
  buildExperimentTracesAggregation,
  parseExperimentTracesAggregation,
  GetEvaluationExperimentTracesRequestParams,
  GetEvaluationExperimentTracesRequestQuery,
} from '@kbn/evals-common';
import type { GetEvaluationExperimentTracesResponse } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';
import {
  MAX_SPANS_PER_TRACE_SEARCH,
  computeTraceDurationMs,
  shapeTraceSpan,
} from '../traces/trace_spans';
import type { EvalTraceSpan, TraceSpanSource } from '../traces/trace_spans';

export const registerGetExperimentTracesRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_TRACES_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment traces',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentTracesRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationExperimentTracesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const { role, evaluator, page, per_page: perPage } = request.query;

          if (evaluator !== undefined && role !== 'evaluator') {
            return response.badRequest({
              body: { message: 'The evaluator filter is only valid together with role=evaluator' },
            });
          }

          const evalsContext = await context.evals;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          // Trace ids are always resolved through the experiment's score
          // documents; traces-* is never searched on experiment attributes.
          const query = buildExperimentFilterQuery(experimentId, {
            evaluatorName: evaluator,
            spaceId,
          });

          const aggregationResponse = await evalsContext.evaluationScoreService.search({
            query,
            size: 0,
            track_total_hits: true,
            aggs: buildExperimentTracesAggregation(role),
          });

          const totalHits = aggregationResponse.hits?.total;
          const matchedScores = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
          if (matchedScores === 0) {
            const message = evaluator
              ? `Experiment not found for evaluator ${evaluator}: ${experimentId}`
              : `Experiment not found: ${experimentId}`;
            return response.notFound({ body: { message } });
          }

          const { total, traces: traceReferences } = parseExperimentTracesAggregation(
            aggregationResponse.aggregations as Record<string, unknown> | undefined,
            { page, perPage }
          );

          const emptyBody: GetEvaluationExperimentTracesResponse = {
            experiment_id: experimentId,
            traces: [],
            total,
            page,
            per_page: perPage,
          };
          if (traceReferences.length === 0) {
            return response.ok({ body: emptyBody });
          }

          // One batched span fetch for the whole page instead of a search per trace.
          const spanResponse = await esClient.search<TraceSpanSource>({
            index: TRACES_INDEX_PATTERN,
            query: {
              terms: { trace_id: traceReferences.map((reference) => reference.trace_id) },
            },
            sort: [{ '@timestamp': { order: 'asc' } }],
            size: MAX_SPANS_PER_TRACE_SEARCH,
          });

          const spansByTraceId = new Map<string, EvalTraceSpan[]>();
          for (const hit of spanResponse.hits?.hits ?? []) {
            const traceId = hit._source?.trace_id;
            if (!traceId) {
              continue;
            }
            const span = shapeTraceSpan(hit, traceId);
            if (!span) {
              continue;
            }
            const group = spansByTraceId.get(traceId);
            if (group) {
              group.push(span);
            } else {
              spansByTraceId.set(traceId, [span]);
            }
          }

          const body: GetEvaluationExperimentTracesResponse = {
            ...emptyBody,
            traces: traceReferences.map((reference) => {
              // A trace whose spans aged out of traces-* keeps its reference with
              // empty spans, so callers can tell an expired trace from a run that
              // was never traced (which has no reference at all).
              const spans = spansByTraceId.get(reference.trace_id) ?? [];
              return {
                ...reference,
                spans,
                total_spans: spans.length,
                duration_ms: computeTraceDurationMs(spans),
              };
            }),
          };

          return response.ok({ body });
        } catch (error) {
          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Get evaluation experiment traces',
          });
          if (tooLarge) return tooLarge;

          logger.error(`Failed to get evaluation experiment traces: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation experiment traces' },
          });
        }
      }
    );
};
