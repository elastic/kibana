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
import { Streams } from '@kbn/streams-schema';
import dateMath from '@kbn/datemath';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import {
  STREAMS_GET_DATA_QUALITY_TOOL_ID as GET_DATA_QUALITY,
  STREAMS_GET_SCHEMA_TOOL_ID as GET_SCHEMA,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID as GET_LIFECYCLE_STATS,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
  getFailedDocCountsForStreams,
} from '../../routes/streams/doc_counts/get_streams_doc_counts';

const getDataQualitySchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.nginx"'),
  start: z
    .string()
    .optional()
    .default('now-24h')
    .describe(
      'Start of time range for failed doc counts (ES date math). Total and degraded counts are always computed over the full index lifecycle. Default: "now-24h"'
    ),
  end: z
    .string()
    .optional()
    .default('now')
    .describe(
      'End of time range for failed doc counts (ES date math). Total and degraded counts are always computed over the full index lifecycle. Default: "now"'
    ),
});

export const createGetDataQualityTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof getDataQualitySchema> => ({
  id: GET_DATA_QUALITY,
  type: ToolType.builtin,
  description: dedent(`
    Returns data quality metrics for a stream: degraded document percentage, failed document percentage, an overall quality score (0-100), and failure store status.

    **When to use:**
    - User asks about data quality, degraded documents, or mapping issues
    - User asks "are there any problems with stream X?"
    - User asks about failure store status

    **When NOT to use:**
    - User wants field-level schema info — use ${GET_SCHEMA}
    - User wants storage or retention info — use ${GET_LIFECYCLE_STATS}
  `),
  tags: ['streams'],
  schema: getDataQualitySchema,
  handler: async ({ name, start, end }, { request }) => {
    try {
      const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      const definition = await streamsClient.getStream(name);
      const isIngestStream = Streams.ingest.all.Definition.is(definition);

      const startMs = dateMath.parse(start)?.valueOf() ?? Date.now() - 24 * 60 * 60 * 1000;
      const endMs = dateMath.parse(end, { roundUp: true })?.valueOf() ?? Date.now();

      const [totalResults, degradedResults, failedResults] = await Promise.all([
        getDocCountsForStreams({
          isServerless: false,
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
      ]);

      const totalCount = totalResults.find((s) => s.stream === name)?.count ?? 0;
      const degradedCount = degradedResults.find((s) => s.stream === name)?.count ?? 0;
      const failedCount = failedResults.find((s) => s.stream === name)?.count ?? 0;

      const degradedPct = totalCount > 0 ? (degradedCount / totalCount) * 100 : 0;
      const allAttempted = totalCount + failedCount;
      const failedPct = allAttempted > 0 ? (failedCount / allAttempted) * 100 : 0;
      const qualityScore = Math.max(0, Math.round(100 - degradedPct - failedPct));

      let failureStoreStatus = 'not_applicable';
      if (isIngestStream) {
        const failureStore = (definition as Streams.ingest.all.Definition).ingest.failure_store;
        if ('enabled' in failureStore) {
          failureStoreStatus = 'enabled';
        } else if ('disabled' in failureStore) {
          failureStoreStatus = 'disabled';
        } else if ('inherit' in failureStore) {
          failureStoreStatus = 'inherited';
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: name,
              total_docs: totalCount,
              degraded_docs: degradedCount,
              degraded_pct: Math.round(degradedPct * 100) / 100,
              failed_docs: failedCount,
              failed_pct: Math.round(failedPct * 100) / 100,
              quality_score: qualityScore,
              failure_store_status: failureStoreStatus,
              failed_docs_time_range: { start, end },
              note: 'total_docs and degraded_docs are computed over the full index lifecycle. failed_docs is scoped to failed_docs_time_range.',
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const statusCode = (err as { statusCode?: number }).statusCode;
      const notFound = statusCode === 404 || message.includes('not found');
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get data quality for stream "${name}": ${message}`,
              stream: name,
              operation: 'get_data_quality',
              likely_cause: notFound
                ? `Stream not found. Use ${LIST_STREAMS} to discover available streams.`
                : 'Insufficient permissions or server error.',
            },
          },
        ],
      };
    }
  },
});
