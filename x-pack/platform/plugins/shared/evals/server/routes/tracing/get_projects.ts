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
  GetTracingProjectsRequestQuery,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { getEsErrorLogDetails } from '../utils/get_es_error_log_details';
import { escapeWildcard, EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS } from './utils';

/**
 * Candidate projects the paging aggregation enumerates. `total` is clamped to
 * this so callers cannot page past what the endpoint is able to return.
 */
export const MAX_TRACING_PROJECTS = 1000;

/**
 * Bucket budget for the trace-id aggregation, kept well below the 65,536 default
 * `search.max_buckets` so token coverage degrades instead of the request failing.
 */
export const MAX_TRACE_ID_BUCKETS = 30_000;

/** Ceiling for a single `terms` query, from the default `index.max_terms_count`. */
const MAX_TERMS_PER_QUERY = 60_000;

/** Ceiling per project, independent of how many projects share the budget. */
const MAX_TRACE_IDS_PER_PROJECT = 10_000;

export const registerGetTracingProjectsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_TRACING_PROJECTS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
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

          const buildRootSpanQuery = (additionalFilters: Array<Record<string, unknown>> = []) => ({
            bool: {
              must_not: [
                { exists: { field: 'parent_span_id' } },
                EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS,
              ],
              filter: [
                ...extraFilters,
                ...additionalFilters,
                {
                  terms: { 'scope.name': ['@kbn/evals', 'inference'] },
                },
              ],
            },
          });

          // `trace_ids` is intentionally not a sub-agg here: nesting it under this
          // terms agg scales buckets by project count and trips `search.max_buckets`.
          const pagingResponse = await esClient.search({
            index: TRACES_INDEX_PATTERN,
            size: 0,
            query: buildRootSpanQuery(),
            aggs: {
              project_count: {
                cardinality: { field: 'name' },
              },
              projects: {
                terms: {
                  field: 'name',
                  size: MAX_TRACING_PROJECTS,
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

          const aggs = pagingResponse.aggregations as Record<string, unknown> | undefined;
          const projectsAgg = aggs?.projects as { buckets: Array<Record<string, unknown>> };
          const projectCountAgg = aggs?.project_count as { value: number };
          const totalProjects = Math.min(projectCountAgg?.value ?? 0, MAX_TRACING_PROJECTS);

          const allBuckets = projectsAgg?.buckets ?? [];
          const startIndex = (page - 1) * perPage;
          const pagedBuckets = allBuckets.slice(startIndex, startIndex + perPage);
          const pagedProjectNames = pagedBuckets.map((bucket) => bucket.key as string);

          const traceIdsByProject: Record<string, string[]> = {};
          if (pagedProjectNames.length > 0) {
            const maxTraceIdsPerProject = Math.min(
              MAX_TRACE_IDS_PER_PROJECT,
              Math.floor(
                Math.min(MAX_TRACE_ID_BUCKETS, MAX_TERMS_PER_QUERY) / pagedProjectNames.length
              )
            );

            const traceIdsResponse = await esClient.search({
              index: TRACES_INDEX_PATTERN,
              size: 0,
              query: buildRootSpanQuery([{ terms: { name: pagedProjectNames } }]),
              aggs: {
                projects: {
                  terms: {
                    field: 'name',
                    size: pagedProjectNames.length,
                  },
                  aggs: {
                    trace_ids: {
                      terms: { field: 'trace_id', size: maxTraceIdsPerProject },
                    },
                  },
                },
              },
            });

            const traceIdsAgg = traceIdsResponse.aggregations?.projects as
              | { buckets: Array<{ key: string; trace_ids: { buckets: Array<{ key: string }> } }> }
              | undefined;

            for (const bucket of traceIdsAgg?.buckets ?? []) {
              const traceIds = (bucket.trace_ids?.buckets ?? []).map(({ key }) => key);
              if (traceIds.length > 0) {
                traceIdsByProject[bucket.key] = traceIds;
              }
            }
          }

          const allTraceIds = Object.values(traceIdsByProject).flat();
          const tokensByProject: Record<string, number> = {};

          if (allTraceIds.length > 0) {
            const tokenResponse = await esClient.search({
              index: TRACES_INDEX_PATTERN,
              size: 0,
              query: {
                terms: { trace_id: allTraceIds },
              },
              aggs: {
                by_project: {
                  filters: {
                    filters: Object.fromEntries(
                      Object.entries(traceIdsByProject).map(([projectName, traceIds]) => [
                        projectName,
                        { terms: { trace_id: traceIds } },
                      ])
                    ),
                  },
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

            const byProjectAgg = tokenResponse.aggregations?.by_project as
              | {
                  buckets: Record<
                    string,
                    { input_tokens: { value: number }; output_tokens: { value: number } }
                  >;
                }
              | undefined;

            for (const [projectName, bucket] of Object.entries(byProjectAgg?.buckets ?? {})) {
              tokensByProject[projectName] =
                (bucket.input_tokens?.value ?? 0) + (bucket.output_tokens?.value ?? 0);
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
          const { message, meta } = getEsErrorLogDetails(error);
          logger.error(`Failed to get tracing projects: ${message}`, meta);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get tracing projects' },
          });
        }
      }
    );
};
