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
import { escapeWildcard } from './utils';

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
          const { from, to, page, per_page: perPage, name: nameFilter } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const ES_MAX_TERMS_COUNT = 60_000;
          const maxTraceIdsPerProject = Math.min(10_000, Math.floor(ES_MAX_TERMS_COUNT / perPage));

          const extraFilters: Array<Record<string, unknown>> = [];
          if (from || to) {
            const range: Record<string, string> = {};
            if (from) range.gte = from;
            if (to) range.lte = to;
            extraFilters.push({ range: { '@timestamp': range } });
          }
          if (nameFilter) {
            extraFilters.push({
              wildcard: {
                name: { value: `*${escapeWildcard(nameFilter)}*`, case_insensitive: true },
              },
            });
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
                  ...extraFilters,
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
                  trace_ids: {
                    terms: { field: 'trace_id', size: maxTraceIdsPerProject },
                  },
                  error_count: {
                    filter: {
                      term: { 'status.code': 'ERROR' },
                    },
                    aggs: {
                      distinct_traces: {
                        cardinality: { field: 'trace_id' },
                      },
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

          const traceIdToProject: Record<string, string> = {};
          for (const bucket of pagedBuckets) {
            const projectName = bucket.key as string;
            const traceIdBuckets =
              (bucket.trace_ids as { buckets: Array<{ key: string }> })?.buckets ?? [];
            for (const tb of traceIdBuckets) {
              traceIdToProject[tb.key] = projectName;
            }
          }

          const allTraceIds = Object.keys(traceIdToProject);
          const tokensByProject: Record<string, number> = {};

          if (allTraceIds.length > 0) {
            const tokenResponse = await esClient.search({
              index: TRACES_INDEX_PATTERN,
              size: 0,
              query: {
                terms: { trace_id: allTraceIds },
              },
              aggs: {
                per_trace: {
                  terms: { field: 'trace_id', size: allTraceIds.length },
                  aggs: {
                    input_tokens: {
                      sum: { field: 'attributes.gen_ai.usage.input_tokens' },
                    },
                    output_tokens: {
                      sum: { field: 'attributes.gen_ai.usage.output_tokens' },
                    },
                  },
                },
              },
            });

            const perTraceAgg = tokenResponse.aggregations?.per_trace as {
              buckets: Array<{
                key: string;
                input_tokens: { value: number };
                output_tokens: { value: number };
              }>;
            };

            for (const traceBucket of perTraceAgg?.buckets ?? []) {
              const projectName = traceIdToProject[traceBucket.key];
              if (projectName) {
                tokensByProject[projectName] =
                  (tokensByProject[projectName] ?? 0) +
                  (traceBucket.input_tokens?.value ?? 0) +
                  (traceBucket.output_tokens?.value ?? 0);
              }
            }
          }

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
            const errorCount = bucket.error_count as {
              doc_count: number;
              distinct_traces: { value: number };
            };
            const distinctErrorTraces = errorCount?.distinct_traces?.value ?? 0;
            const errorRate = traceCount > 0 ? distinctErrorTraces / traceCount : 0;

            return {
              name,
              trace_count: traceCount,
              error_rate: Math.round(errorRate * 100) / 100,
              p50_latency_ms: Math.round((p50Ns / 1_000_000) * 100) / 100,
              p99_latency_ms: Math.round((p99Ns / 1_000_000) * 100) / 100,
              total_tokens: tokensByProject[name] ?? 0,
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
