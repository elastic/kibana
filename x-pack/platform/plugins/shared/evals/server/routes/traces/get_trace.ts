/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_TRACE_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  TRACES_INDEX_PATTERN,
  buildRouteValidationWithZod,
  GetTraceRequestParams,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

interface TraceSpanSource {
  span_id?: string;
  parent_span_id?: string;
  trace_id?: string;
  name?: string;
  kind?: string;
  status?: { code?: string };
  '@timestamp'?: string;
  duration?: number;
  attributes?: Record<string, unknown>;
}

export const registerGetTraceRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_TRACE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get trace spans',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetTraceRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { traceId } = request.params;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const searchResponse = await esClient.search<TraceSpanSource>({
            index: TRACES_INDEX_PATTERN,
            query: {
              term: { trace_id: traceId },
            },
            sort: [{ '@timestamp': { order: 'asc' } }],
            size: 10000,
          });

          const hits = searchResponse.hits?.hits ?? [];
          const spans = hits
            .map((hit) => {
              const source = hit._source;
              if (!source) return null;

              const startTime = source['@timestamp'] ?? '';
              const durationNs = source.duration ?? 0;
              const durationMs = durationNs / 1_000_000;

              return {
                span_id: source.span_id ?? hit._id,
                trace_id: source.trace_id ?? traceId,
                parent_span_id: source.parent_span_id,
                name: source.name ?? 'unknown',
                kind: source.kind,
                status: source.status?.code,
                start_time: startTime,
                duration_ms: durationMs,
                attributes: source.attributes ?? {},
              };
            })
            .filter((span): span is NonNullable<typeof span> => span !== null);

          let totalDurationMs = 0;
          if (spans.length > 0) {
            const earliestStart = Math.min(...spans.map((s) => new Date(s.start_time).getTime()));
            const latestEnd = Math.max(
              ...spans.map((s) => new Date(s.start_time).getTime() + s.duration_ms)
            );
            totalDurationMs = latestEnd - earliestStart;
          }

          return response.ok({
            body: {
              trace_id: traceId,
              spans,
              total_spans: spans.length,
              duration_ms: totalDurationMs,
            },
          });
        } catch (error) {
          logger.error(`Failed to get trace: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get trace' },
          });
        }
      }
    );
};
