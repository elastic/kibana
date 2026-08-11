/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { Streams } from '@kbn/streams-schema';
import { getFlattenedObject } from '@kbn/std';
import dateMath from '@kbn/datemath';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import {
  STREAMS_DIAGNOSE_STREAM_TOOL_ID as DIAGNOSE_STREAM,
  STREAMS_INSPECT_STREAMS_TOOL_ID as INSPECT_STREAMS,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID as QUERY_DOCUMENTS,
} from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { computeQualityMetrics } from '../../utils/quality_utils';
import { getStreamConvention, getConventionHint } from '../../utils/convention_utils';
import { getEffectiveFieldConstraints } from '../../utils/mapping_utils';
import {
  getDocCountsForStreams,
  getDegradedDocCountsForStreams,
  getFailedDocCountsForStreams,
} from '../../../routes/streams/doc_counts/get_streams_doc_counts';
import { getDocCountInTimeRange } from '../../utils/doc_count_utils';

const MAX_ERROR_SAMPLES = 5;
const MAX_STACK_TRACE_LENGTH = 300;
const MAX_DEGRADED_FIELDS = 25;
const MAX_SAMPLE_DOC_FIELDS = 30;
const MAX_SAMPLE_DOC_STRING_LENGTH = 200;

const diagnoseStreamSchema = z.object({
  name: z.string().describe('Exact stream name to diagnose, e.g. "logs.ecs.nginx"'),
  time_range: z
    .string()
    .optional()
    .describe(
      'Lookback period for failed doc counts and error samples. Uses date math: "1h", "6h", "24h", "7d". Default: "24h". Use shorter ranges to check if issues are still active.'
    ),
});

export const createDiagnoseStreamTool = ({
  getScopedClients,
  isServerless,
  logger,
}: {
  getScopedClients: GetScopedClients;
  isServerless: boolean;
  logger: Logger;
}): BuiltinToolDefinition<typeof diagnoseStreamSchema> => ({
  id: DIAGNOSE_STREAM,
  type: ToolType.builtin,
  description: dedent(`
    Gathers time-windowed health metrics, failure store error samples, and degraded
    field breakdown for a single stream. This is the diagnostic investigation tool —
    use it to understand what is going wrong and when.

    Results include a \`time_window\` showing the exact time range queried, and each
    error group includes \`first_seen\` / \`last_seen\` timestamps. Use \`last_seen\` to
    determine whether errors are still active or historical.

    When degraded documents are present, \`degraded_fields\` lists which specific
    fields triggered the \`_ignored\` flag during indexing (e.g. a keyword value
    exceeding \`ignore_above\`, or a type mismatch with \`ignore_malformed\`). Each
    entry includes the field name, document count, last occurrence timestamp,
    a \`mapping\` object with the effective Elasticsearch mapping constraints for
    that field (e.g. \`{ type: "keyword", ignore_above: 8191 }\`), and a
    \`sample_value\` showing the actual field value from a recent degraded document.
    Compare \`sample_value\` against \`mapping\` constraints to determine root cause
    (e.g. string length vs \`ignore_above\` limit). Do not guess or assume defaults.

    **Before attempting fixes:** If \`last_seen\` is not near \`time_window.to\`, the errors
    may be stale. Re-diagnose with a shorter time_range (e.g. "1h") to confirm the issue
    still persists. Do not fix stale errors.

    Each error group includes a \`sample_document\` — the flattened original document that
    failed ingestion. Use these field values to understand what triggered the error (e.g.
    what value a field contained when a type mismatch occurred).

    **Cross-referencing with configuration:** This tool returns diagnostic data only — you
    perform the analysis. For the processing chain, call ${INSPECT_STREAMS} with aspects
    \`['processing']\` in parallel. Error messages typically name the operation that failed
    and the field/value involved — match these against the \`action\` and field parameters
    of steps in the processing chain to identify the responsible step and which stream
    (via \`source\` attribution) defines it. For ad-hoc queries against the full failure
    store (custom filters, aggregations, more samples), use ${QUERY_DOCUMENTS} with
    source: 'failures'.

    **When to use:**
    - User asks "why is my stream broken?" or "diagnose issues with stream X"
    - User reports ingestion failures or data quality problems
    - ${INSPECT_STREAMS} shows high degraded_pct — call this tool for per-field breakdown
    - Before attempting to fix processing — diagnose first to understand the root cause
    - After applying a fix — only verify when the user asks. Compare last_seen on error groups to the applied_at timestamp from the write result. If last_seen < applied_at, those errors are pre-fix residuals

    **When NOT to use:**
    - User just wants to browse data — use ${INSPECT_STREAMS}
    - User wants general stream info without problems — use ${INSPECT_STREAMS}

    **Efficiency:** If you already called this tool for the same stream earlier in the conversation and no write tools have modified it since, the prior result is still valid — do not re-call. When you need both diagnostic data and configuration context, call this tool and ${INSPECT_STREAMS} in parallel.
  `),
  tags: ['streams'],
  schema: diagnoseStreamSchema,
  handler: async ({ name, time_range }, { request }) => {
    try {
      const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;
      const definition = await streamsClient.getStream(name);

      if (!Streams.ingest.all.Definition.is(definition)) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                stream_type: 'query',
                health: 'not_applicable' as const,
                note: 'Query streams are read-only ES|QL views. They do not have processing pipelines or failure stores. Check the source streams referenced by this query instead.',
              },
            },
          ],
        };
      }

      const streamType = Streams.WiredStream.Definition.is(definition) ? 'wired' : 'classic';

      const timeRange = time_range || '24h';
      const endMs = Date.now();
      const startMs = dateMath.parse(`now-${timeRange}`)?.valueOf() ?? endMs - 24 * 60 * 60 * 1000;

      const [totalResults, degradedResults, failedResults, failureStoreResult, windowedTotalCount] =
        await Promise.all([
          getDocCountsForStreams({
            isServerless,
            esClient,
            esClientAsSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
            streamName: name,
          }),
          getDegradedDocCountsForStreams({ esClient, streamName: name }),
          getFailedDocCountsForStreams({
            esClient,
            start: startMs,
            end: endMs,
            streamName: name,
          }),
          getFailureStoreErrors(esClient, name, startMs, endMs),
          getDocCountInTimeRange({ esClient, streamName: name, start: startMs, end: endMs }),
        ]);

      const totalCount = totalResults.find((s) => s.stream === name)?.count ?? 0;
      const degradedCount = degradedResults.find((s) => s.stream === name)?.count ?? 0;
      const failedCount = failedResults.find((s) => s.stream === name)?.count ?? 0;
      const { degradedPct, failedPct } = computeQualityMetrics({
        totalCount,
        degradedCount,
        failedCount,
        windowedTotalCount,
      });

      const health = determineHealth({ failedCount, failedPct, degradedPct });

      const result: Record<string, unknown> = {
        stream: name,
        stream_type: streamType,
        health,
        time_window: {
          range: timeRange,
          from: new Date(startMs).toISOString(),
          to: new Date(endMs).toISOString(),
        },
        metrics: {
          total_docs: totalCount,
          degraded_docs: degradedCount,
          degraded_pct: Math.round(degradedPct * 100) / 100,
          recent_failed_docs: failedCount,
          failed_pct: Math.round(failedPct * 100) / 100,
        },
        errors: failureStoreResult.groups,
      };

      if (failureStoreResult.retrieval_error) {
        result.errors_retrieval_error = failureStoreResult.retrieval_error;
      }

      if (degradedCount > 0) {
        const degradedFields = await getDegradedFieldBreakdown(esClient, name, startMs, endMs);
        if (degradedFields.length > 0) {
          try {
            const fieldNames = degradedFields.map((f) => f.name);
            const constraintsMap = await getEffectiveFieldConstraints(esClient, name, fieldNames);
            for (const entry of degradedFields) {
              const constraints = constraintsMap.get(entry.name);
              if (constraints) {
                entry.mapping = constraints;
              }
            }
          } catch (err) {
            logger.warn(
              `Failed to look up field mapping constraints for stream "${name}": ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
          const convention = getStreamConvention(definition);
          result.degraded_fields = degradedFields;
          result.degraded_fields_convention_hint = getConventionHint(convention);
        }
      }

      result.pipeline_updated_at = definition.ingest.processing.updated_at;

      return {
        results: [{ type: ToolResultType.other, data: result }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to diagnose stream "${name}": ${message}`,
              stream: name,
              operation: 'diagnose_stream',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});

interface ErrorGroup {
  error_type: string;
  error_message: string;
  count: number;
  first_seen: string;
  last_seen: string;
  sample_stack_trace?: string;
  sample_document?: Record<string, unknown>;
}

interface FailureStoreDoc {
  '@timestamp'?: string;
  document?: {
    source?: Record<string, unknown>;
  };
  error?: {
    type?: string;
    message?: string;
    stack_trace?: string;
  };
}

interface FailureStoreAgg {
  error_groups: {
    buckets: Array<{
      key: [string, string];
      doc_count: number;
      first_seen: { value: number | null; value_as_string?: string };
      last_seen: { value: number | null; value_as_string?: string };
      sample: { hits: { hits: Array<{ _source?: FailureStoreDoc }> } };
    }>;
  };
}

interface FailureStoreResult {
  groups: ErrorGroup[];
  retrieval_error?: string;
}

const getFailureStoreErrors = async (
  esClient: ElasticsearchClient,
  streamName: string,
  startMs: number,
  endMs: number
): Promise<FailureStoreResult> => {
  try {
    const response = await esClient.search<unknown, FailureStoreAgg>({
      index: `${streamName}${FAILURE_STORE_SELECTOR}`,
      size: 0,
      query: {
        range: { '@timestamp': { gte: startMs, lte: endMs } },
      },
      aggs: {
        error_groups: {
          multi_terms: {
            terms: [
              { field: 'error.type', missing: 'unknown' },
              { field: 'error.message', missing: 'unknown' },
            ],
            size: MAX_ERROR_SAMPLES,
            order: { _count: 'desc' as const },
          },
          aggs: {
            first_seen: { min: { field: '@timestamp' } },
            last_seen: { max: { field: '@timestamp' } },
            sample: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' as const } }],
                _source: ['@timestamp', 'error.stack_trace', 'document.source'],
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.error_groups.buckets ?? [];
    const groups: ErrorGroup[] = buckets.map((bucket) => {
      const sampleHit = bucket.sample.hits.hits[0]?._source;
      const stackTrace = sampleHit?.error?.stack_trace;
      const originalDoc = sampleHit?.document?.source;
      return {
        error_type: bucket.key[0],
        error_message: bucket.key[1],
        count: bucket.doc_count,
        first_seen: bucket.first_seen.value
          ? new Date(bucket.first_seen.value).toISOString()
          : new Date(startMs).toISOString(),
        last_seen: bucket.last_seen.value
          ? new Date(bucket.last_seen.value).toISOString()
          : new Date(endMs).toISOString(),
        ...(stackTrace && { sample_stack_trace: truncateStackTrace(stackTrace) }),
        ...(originalDoc && {
          sample_document: truncateDocument(getFlattenedObject(originalDoc)),
        }),
      };
    });

    return { groups };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { groups: [], retrieval_error: reason };
  }
};

const truncateStackTrace = (trace: string): string =>
  trace.length > MAX_STACK_TRACE_LENGTH ? `${trace.slice(0, MAX_STACK_TRACE_LENGTH)}...` : trace;

const truncateDocument = (flat: Record<string, unknown>): Record<string, unknown> => {
  const entries = Object.entries(flat);
  const capped = entries.slice(0, MAX_SAMPLE_DOC_FIELDS);
  const result: Record<string, unknown> = {};
  for (const [key, value] of capped) {
    result[key] =
      typeof value === 'string' && value.length > MAX_SAMPLE_DOC_STRING_LENGTH
        ? `${value.slice(0, MAX_SAMPLE_DOC_STRING_LENGTH)}...`
        : value;
  }
  if (entries.length > MAX_SAMPLE_DOC_FIELDS) {
    result._truncated = `${entries.length - MAX_SAMPLE_DOC_FIELDS} more fields omitted`;
  }
  return result;
};

interface DegradedFieldEntry {
  name: string;
  count: number;
  last_occurrence: string;
  sample_value?: unknown;
  mapping?: {
    type: string;
    ignore_above?: number;
    ignore_malformed?: boolean;
    [key: string]: unknown;
  };
}

interface DegradedFieldsAgg {
  degraded_fields: {
    buckets: Array<{
      key: string;
      doc_count: number;
      last_occurrence: { value: number | null };
      sample: { hits: { hits: Array<{ _source?: Record<string, unknown> }> } };
    }>;
  };
}

const extractFieldValue = (source: Record<string, unknown>, fieldPath: string): unknown => {
  const flat = getFlattenedObject(source);
  return flat[fieldPath];
};

const truncateSampleValue = (value: unknown): unknown => {
  if (typeof value === 'string' && value.length > MAX_SAMPLE_DOC_STRING_LENGTH) {
    return `${value.slice(0, MAX_SAMPLE_DOC_STRING_LENGTH)}...`;
  }
  return value;
};

const getDegradedFieldBreakdown = async (
  esClient: ElasticsearchClient,
  streamName: string,
  startMs: number,
  endMs: number
): Promise<DegradedFieldEntry[]> => {
  try {
    const response = await esClient.search<unknown, DegradedFieldsAgg>({
      index: streamName,
      size: 0,
      query: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: startMs, lte: endMs } } }],
          must: [{ exists: { field: '_ignored' } }],
        },
      },
      aggs: {
        degraded_fields: {
          terms: { field: '_ignored', size: MAX_DEGRADED_FIELDS },
          aggs: {
            last_occurrence: { max: { field: '@timestamp' } },
            sample: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' as const } }],
                _source: true,
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.degraded_fields.buckets ?? [];
    return buckets.map((bucket) => {
      const sampleSource = bucket.sample?.hits?.hits?.[0]?._source;
      const rawValue =
        sampleSource != null ? extractFieldValue(sampleSource, bucket.key) : undefined;
      const sampleValue = rawValue != null ? truncateSampleValue(rawValue) : undefined;

      return {
        name: bucket.key,
        count: bucket.doc_count,
        last_occurrence: bucket.last_occurrence.value
          ? new Date(bucket.last_occurrence.value).toISOString()
          : new Date(endMs).toISOString(),
        ...(sampleValue != null && { sample_value: sampleValue }),
      };
    });
  } catch {
    return [];
  }
};

const determineHealth = ({
  failedCount,
  failedPct,
  degradedPct,
}: {
  failedCount: number;
  failedPct: number;
  degradedPct: number;
}): 'healthy' | 'degraded' | 'failing' => {
  if (failedPct > 5) return 'failing';
  if (failedCount > 0) return 'degraded';
  if (degradedPct > 3) return 'degraded';
  return 'healthy';
};
