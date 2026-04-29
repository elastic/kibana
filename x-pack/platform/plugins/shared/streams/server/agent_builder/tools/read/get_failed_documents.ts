/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getFlattenedObject } from '@kbn/std';
import dateMath from '@kbn/datemath';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import {
  STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID as GET_FAILED_DOCUMENTS,
  STREAMS_GET_DATA_QUALITY_TOOL_ID as GET_DATA_QUALITY,
} from '../tool_ids';
import { classifyError } from '../error_utils';

const MAX_SAMPLE_SIZE = 50;
const MAX_STACK_TRACE_LENGTH = 500;
const MAX_SOURCE_STRING_LENGTH = 200;

const getFailedDocumentsSchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.ecs.nginx"'),
  start: z
    .string()
    .optional()
    .default('now-24h')
    .describe('Start of time range (ES date math). Default: "now-24h"'),
  end: z
    .string()
    .optional()
    .default('now')
    .describe('End of time range (ES date math). Default: "now"'),
  size: z
    .number()
    .optional()
    .default(10)
    .describe('Number of sample failed documents to return (max 50). Default: 10'),
});

export const createGetFailedDocumentsTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof getFailedDocumentsSchema> => ({
  id: GET_FAILED_DOCUMENTS,
  type: ToolType.builtin,
  description: dedent(`
    Retrieves documents from a stream's failure store with error details (error type, message, stack trace) and the original document that failed ingestion. Use this for root cause analysis when data quality issues are detected.

    **When to use:**
    - User asks "why are documents failing?" or "what errors are in the failure store?"
    - User wants to see failed/rejected documents and their error details
    - Follow-up to ${GET_DATA_QUALITY} when failed document count is non-zero

    **When NOT to use:**
    - User wants aggregate quality metrics (degraded %, failed %) — use ${GET_DATA_QUALITY}

    **Formatting:** Show the error type breakdown first (e.g. "mapper_exception — 42 docs"). Then show each sample document with its error type, error message, and key fields from the original document. Group samples by error type when multiple types are present.
  `),
  tags: ['streams'],
  schema: getFailedDocumentsSchema,
  handler: async ({ name, start, end, size }, { request }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      const cappedSize = Math.min(Math.max(0, size), MAX_SAMPLE_SIZE);
      const failureIndex = `${name}${FAILURE_STORE_SELECTOR}`;

      const startMs = dateMath.parse(start)?.valueOf();
      const endMs = dateMath.parse(end, { roundUp: true })?.valueOf();

      const timeRange =
        startMs || endMs
          ? {
              range: {
                '@timestamp': {
                  ...(startMs && { gte: startMs }),
                  ...(endMs && { lte: endMs }),
                },
              },
            }
          : undefined;

      const query = timeRange ? { bool: { must: [timeRange] } } : { match_all: {} };

      const response = await esClient.search({
        index: failureIndex,
        size: cappedSize,
        query,
        sort: [{ '@timestamp': { order: 'desc' } }],
        aggs: {
          error_types: {
            terms: { field: 'error.type', size: 20 },
          },
        },
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      const errorTypeBuckets = (
        response.aggregations?.error_types as {
          buckets?: Array<{ key: string; doc_count: number }>;
        }
      )?.buckets;

      const errorTypeBreakdown = (errorTypeBuckets ?? []).map((bucket) => ({
        type: bucket.key,
        count: bucket.doc_count,
      }));

      const sampleDocuments = formatFailedDocuments(response.hits.hits);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: name,
              time_range: { start, end },
              total_failed: totalHits,
              error_type_breakdown: errorTypeBreakdown,
              sample_documents: sampleDocuments,
              returned_count: sampleDocuments.length,
              error_source: 'stream_processing',
            },
          },
        ],
      };
    } catch (err) {
      if (isNotFoundError(err)) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                time_range: { start, end },
                total_failed: 0,
                error_type_breakdown: [],
                sample_documents: [],
                returned_count: 0,
                note: 'No failure store exists for this stream. This typically means no documents have failed ingestion.',
              },
            },
          ],
        };
      }

      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get failed documents for stream "${name}": ${message}`,
              stream: name,
              operation: 'get_failed_documents',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});

export const isNotFoundError = (err: unknown): boolean => {
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode === 404) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('index_not_found_exception');
};

export const formatFailedDocuments = (
  hits: Array<{ _source?: unknown }>
): Array<Record<string, unknown>> => {
  return hits.map((hit) => {
    const source = (hit._source ?? {}) as {
      '@timestamp'?: string;
      document?: { source?: Record<string, unknown> };
      error?: { type?: string; message?: string; stack_trace?: string };
    };

    const originalDoc = source.document?.source;
    let truncatedSource: Record<string, unknown> | undefined;
    if (originalDoc) {
      const flat = getFlattenedObject(originalDoc);
      truncatedSource = {};
      for (const [key, value] of Object.entries(flat)) {
        if (typeof value === 'string' && value.length > MAX_SOURCE_STRING_LENGTH) {
          truncatedSource[key] = `${value.slice(0, MAX_SOURCE_STRING_LENGTH)}...`;
        } else {
          truncatedSource[key] = value;
        }
      }
    }

    const stackTrace = source.error?.stack_trace;
    const truncatedStackTrace =
      stackTrace && stackTrace.length > MAX_STACK_TRACE_LENGTH
        ? `${stackTrace.slice(0, MAX_STACK_TRACE_LENGTH)}...`
        : stackTrace;

    return {
      '@timestamp': source['@timestamp'],
      error_type: source.error?.type,
      error_message: source.error?.message,
      ...(truncatedStackTrace && { error_stack_trace: truncatedStackTrace }),
      ...(truncatedSource && { original_document: truncatedSource }),
    };
  });
};
