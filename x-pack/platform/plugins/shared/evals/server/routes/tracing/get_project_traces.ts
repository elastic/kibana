/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_TRACING_PROJECT_TRACES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  TRACES_INDEX_PATTERN,
  GetProjectTracesRequestParams,
  GetProjectTracesRequestQuery,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { escapeWildcard } from './utils';

interface RootSpanSource {
  trace_id?: string;
  name?: string;
  '@timestamp'?: string;
  duration?: number;
  status?: { code?: string };
  attributes?: Record<string, unknown>;
}

export const registerGetProjectTracesRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_TRACING_PROJECT_TRACES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List traces for a tracing project',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetProjectTracesRequestParams),
            query: buildRouteValidationWithZod(GetProjectTracesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { projectName } = request.params;
          const {
            from,
            to,
            name: nameFilter,
            sort_field: sortField,
            sort_order: sortOrder,
            page,
            per_page: perPage,
          } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const filters: Array<Record<string, unknown>> = [{ term: { name: projectName } }];

          if (from || to) {
            const range: Record<string, string> = {};
            if (from) range.gte = from;
            if (to) range.lte = to;
            filters.push({ range: { '@timestamp': range } });
          }

          if (nameFilter) {
            const escaped = escapeWildcard(nameFilter);
            filters.push({
              bool: {
                should: [
                  {
                    wildcard: {
                      'attributes.input.value': {
                        value: `*${escaped}*`,
                        case_insensitive: true,
                      },
                    },
                  },
                  {
                    wildcard: {
                      'attributes.output.value': {
                        value: `*${escaped}*`,
                        case_insensitive: true,
                      },
                    },
                  },
                  {
                    wildcard: {
                      'attributes.gen_ai.prompt.id': {
                        value: `*${escaped}*`,
                        case_insensitive: true,
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            });
          }

          const sortMap: Record<string, string> = {
            start_time: '@timestamp',
            duration: 'duration',
            name: 'name',
          };
          const esSortField = sortMap[sortField] ?? '@timestamp';

          const rootSpanQuery = {
            bool: {
              must_not: [
                { exists: { field: 'parent_span_id' } },
                { exists: { field: 'attributes.evaluator.name' } },
              ],
              filter: [
                ...filters,
                {
                  terms: { 'scope.name': ['@kbn/evals', 'inference'] },
                },
              ],
            },
          };

          const searchResponse = await esClient.search<RootSpanSource>({
            index: TRACES_INDEX_PATTERN,
            size: perPage,
            from: (page - 1) * perPage,
            track_total_hits: true,
            query: rootSpanQuery,
            sort: [{ [esSortField]: { order: sortOrder } }],
          });

          const hits = searchResponse.hits?.hits ?? [];
          const totalHits = searchResponse.hits?.total;
          const total =
            typeof totalHits === 'number'
              ? totalHits
              : (totalHits as { value: number })?.value ?? 0;

          const traceIds = hits
            .map((hit) => hit._source?.trace_id ?? hit._id)
            .filter((id): id is string => !!id);

          const spanCountMap: Record<string, number> = {};
          const tokenAggMap: Record<string, { input: number; output: number }> = {};
          const childEnrichMap: Record<
            string,
            { promptId?: string; model?: string; inputPreview?: string; outputPreview?: string }
          > = {};

          if (traceIds.length > 0) {
            const spanCountResponse = await esClient.search({
              index: TRACES_INDEX_PATTERN,
              size: 0,
              query: {
                terms: { trace_id: traceIds },
              },
              aggs: {
                per_trace: {
                  terms: { field: 'trace_id', size: traceIds.length },
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

            const perTraceAgg = spanCountResponse.aggregations?.per_trace as {
              buckets: Array<{
                key: string;
                doc_count: number;
                input_tokens: { value: number };
                output_tokens: { value: number };
              }>;
            };

            for (const bucket of perTraceAgg?.buckets ?? []) {
              spanCountMap[bucket.key] = bucket.doc_count;
              tokenAggMap[bucket.key] = {
                input: bucket.input_tokens?.value ?? 0,
                output: bucket.output_tokens?.value ?? 0,
              };
            }

            const childEnrichResponse = await esClient.search({
              index: TRACES_INDEX_PATTERN,
              size: 0,
              query: {
                bool: {
                  filter: [
                    { terms: { trace_id: traceIds } },
                    { exists: { field: 'parent_span_id' } },
                  ],
                  should: [
                    { exists: { field: 'attributes.gen_ai.prompt.id' } },
                    { exists: { field: 'attributes.gen_ai.request.model' } },
                    { exists: { field: 'attributes.output.value' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              aggs: {
                per_trace: {
                  terms: { field: 'trace_id', size: traceIds.length },
                  aggs: {
                    earliest_hit: {
                      top_hits: {
                        size: 3,
                        sort: [{ '@timestamp': { order: 'asc' } }],
                        _source: [
                          'trace_id',
                          'name',
                          'attributes.gen_ai.prompt.id',
                          'attributes.gen_ai.request.model',
                          'attributes.output.value',
                          'attributes.input.value',
                        ],
                      },
                    },
                  },
                },
              },
            });

            const perTraceEnrichAgg = childEnrichResponse.aggregations?.per_trace as {
              buckets: Array<{
                key: string;
                earliest_hit: {
                  hits: {
                    hits: Array<{
                      _source?: {
                        trace_id?: string;
                        attributes?: Record<string, unknown>;
                      };
                    }>;
                  };
                };
              }>;
            };

            for (const bucket of perTraceEnrichAgg?.buckets ?? []) {
              const tid = bucket.key;
              childEnrichMap[tid] = {};
              const entry = childEnrichMap[tid];

              for (const hit of bucket.earliest_hit?.hits?.hits ?? []) {
                const childAttrs = hit._source?.attributes ?? {};

                if (!entry.promptId && childAttrs['gen_ai.prompt.id']) {
                  entry.promptId = String(childAttrs['gen_ai.prompt.id']);
                }
                if (!entry.model && childAttrs['gen_ai.request.model']) {
                  entry.model = String(childAttrs['gen_ai.request.model']);
                }
                if (!entry.inputPreview && childAttrs['input.value']) {
                  entry.inputPreview = String(childAttrs['input.value']).substring(0, 200);
                }
                if (!entry.outputPreview && childAttrs['output.value']) {
                  entry.outputPreview = String(childAttrs['output.value']).substring(0, 200);
                }
              }
            }
          }

          const traces = hits
            .map((hit) => {
              const source = hit._source;
              if (!source) return null;

              const traceId = source.trace_id ?? hit._id ?? '';
              const durationNs = source.duration ?? 0;
              const durationMs = durationNs / 1_000_000;
              const attrs = source.attributes ?? {};
              const childData = childEnrichMap[traceId];

              const inputPreview =
                (attrs['gen_ai.system.message'] as string) ??
                (attrs['input.value'] as string) ??
                childData?.inputPreview ??
                undefined;
              const outputPreview =
                (attrs['output.value'] as string) ?? childData?.outputPreview ?? undefined;
              const tokenData = tokenAggMap[traceId];

              return {
                trace_id: traceId,
                name: source.name ?? 'unknown',
                start_time: source['@timestamp'] ?? '',
                duration_ms: Math.round(durationMs * 100) / 100,
                status: source.status?.code,
                total_spans: spanCountMap[traceId] ?? 1,
                input_preview: inputPreview ? String(inputPreview).substring(0, 200) : undefined,
                output_preview: outputPreview ? String(outputPreview).substring(0, 200) : undefined,
                tokens: tokenData
                  ? {
                      input: tokenData.input,
                      output: tokenData.output,
                      total: tokenData.input + tokenData.output,
                    }
                  : undefined,
                prompt_id:
                  childData?.promptId ?? (attrs['gen_ai.prompt.id'] as string) ?? undefined,
                model: childData?.model ?? (attrs['gen_ai.request.model'] as string) ?? undefined,
              };
            })
            .filter((trace): trace is NonNullable<typeof trace> => trace !== null);

          return response.ok({
            body: {
              traces,
              total,
            },
          });
        } catch (error) {
          logger.error(
            `Failed to get project traces: ${error instanceof Error ? error.message : error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get project traces' },
          });
        }
      }
    );
};
