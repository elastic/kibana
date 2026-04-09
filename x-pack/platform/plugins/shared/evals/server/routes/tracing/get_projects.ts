/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_TRACING_PROJECTS_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  TRACES_INDEX_PATTERN,
  buildRouteValidationWithZod,
  GetTracingProjectsRequestQuery,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetTracingProjectsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_TRACING_PROJECTS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List tracing projects',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetTracingProjectsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { from, to, page, per_page: perPage } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const rangeFilter: Array<Record<string, unknown>> = [];
          if (from || to) {
            const range: Record<string, string> = {};
            if (from) range.gte = from;
            if (to) range.lte = to;
            rangeFilter.push({ range: { '@timestamp': range } });
          }

          const searchResponse = await esClient.search({
            index: TRACES_INDEX_PATTERN,
            size: 0,
            query: {
              bool: {
                must_not: [
                  { exists: { field: 'parent_span_id' } },
                  { exists: { field: 'attributes.evaluator.name' } },
                ],
                filter: [
                  ...rangeFilter,
                  {
                    terms: { 'scope.name': ['@kbn/evals', 'inference'] },
                  },
                ],
              },
            },
            aggs: {
              project_count: {
                cardinality: { field: 'name' },
              },
              projects: {
                terms: {
                  field: 'name',
                  size: 1000,
                  order: { last_trace: 'desc' },
                },
                aggs: {
                  distinct_traces: {
                    cardinality: { field: 'trace_id' },
                  },
                  last_trace: {
                    max: { field: '@timestamp' },
                  },
                  latency_percentiles: {
                    percentiles: {
                      field: 'duration',
                      percents: [50, 99],
                    },
                  },
                  total_input_tokens: {
                    sum: { field: 'attributes.gen_ai.usage.input_tokens' },
                  },
                  total_output_tokens: {
                    sum: { field: 'attributes.gen_ai.usage.output_tokens' },
                  },
                  error_count: {
                    filter: {
                      term: { 'status.code': 'ERROR' },
                    },
                  },
                },
              },
            },
          });

          const aggs = searchResponse.aggregations as Record<string, unknown> | undefined;
          const projectsAgg = aggs?.projects as { buckets: Array<Record<string, unknown>> };
          const projectCountAgg = aggs?.project_count as { value: number };
          const totalProjects = projectCountAgg?.value ?? 0;

          const allBuckets = projectsAgg?.buckets ?? [];
          const startIndex = (page - 1) * perPage;
          const pagedBuckets = allBuckets.slice(startIndex, startIndex + perPage);

          const projects = pagedBuckets.map((bucket) => {
            const name = bucket.key as string;
            const distinctTraces = bucket.distinct_traces as { value: number };
            const traceCount = distinctTraces?.value ?? 0;
            const lastTrace = bucket.last_trace as { value_as_string?: string };
            const lastTraceTime = lastTrace?.value_as_string ?? '';
            const latencyPercentiles = bucket.latency_percentiles as {
              values: Record<string, number>;
            };
            const p50Ns = latencyPercentiles?.values?.['50.0'] ?? 0;
            const p99Ns = latencyPercentiles?.values?.['99.0'] ?? 0;
            const totalInputTokens = bucket.total_input_tokens as { value: number };
            const totalOutputTokens = bucket.total_output_tokens as { value: number };
            const totalTokens = (totalInputTokens?.value ?? 0) + (totalOutputTokens?.value ?? 0);
            const errorCount = bucket.error_count as { doc_count: number };
            const errorRate = traceCount > 0 ? (errorCount?.doc_count ?? 0) / traceCount : 0;

            return {
              name,
              trace_count: traceCount,
              error_rate: Math.round(errorRate * 100) / 100,
              p50_latency_ms: Math.round((p50Ns / 1_000_000) * 100) / 100,
              p99_latency_ms: Math.round((p99Ns / 1_000_000) * 100) / 100,
              total_tokens: totalTokens,
              last_trace_time: lastTraceTime,
            };
          });

          return response.ok({
            body: {
              projects,
              total: totalProjects,
            },
          });
        } catch (error) {
          logger.error(`Failed to get tracing projects: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get tracing projects' },
          });
        }
      }
    );
};
