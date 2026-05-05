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
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import { Streams } from '@kbn/streams-schema';
import { conditionSchema } from '@kbn/streamlang';
import { partitionStream } from '@kbn/streams-ai';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_SUGGEST_PARTITIONS_TOOL_ID } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { abortSignalFromRequest } from '../../utils/write_queue';

const SUGGEST_PARTITIONS_MAX_STEPS = 4;
const SUGGEST_PARTITIONS_TIMEOUT_MS = 3 * 60 * 1000;
const TIME_RANGE_CAP_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_TIME_RANGE_MS = 24 * 60 * 60 * 1000;

const suggestPartitionsSchema = z.object({
  stream_name: z
    .string()
    .describe('Exact wired stream name to suggest partitions for, e.g. "logs.otel.linux".'),
  user_prompt: z
    .string()
    .max(2000)
    .optional()
    .describe(
      'Optional natural-language guidance describing how the user wants to split the stream, ' +
        'e.g. "separate by service", "split errors from normal traffic", "group by host". ' +
        'Omit when the user gives no specific direction.'
    ),
  previous_suggestions: z
    .array(z.object({ name: z.string(), condition: conditionSchema }))
    .optional()
    .describe(
      [
        'Previously suggested but not-yet-applied partitions, for iterative refinement. Pass',
        "these when the user wants different suggestions than a prior call (e.g. 'give me",
        "different partitions'). Use the `name` and `condition` fields exactly as returned by",
        "the prior call. Do NOT pass the stream's real existing partitions here — those are",
        'fetched automatically from the stream definition.',
      ].join(' ')
    ),
});

interface SuggestPartitionsToolArgs {
  getScopedClients: GetScopedClients;
  logger: Logger;
}

export const createSuggestPartitionsTool = ({
  getScopedClients,
  logger,
}: SuggestPartitionsToolArgs): BuiltinToolDefinition<typeof suggestPartitionsSchema> => ({
  id: STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Suggests how to partition a wired ingest stream into child streams (routes) based on the actual data shape. Does NOT apply changes — present the suggestions for review and use the create partition tool to apply.

    The tool clusters recent documents not already covered by existing routes, and proposes child stream names with routing conditions. Use it when the user asks to "split", "partition", "route", or "break up" a stream.

    **When to use:**
    - "split this stream by service / host / log level / environment"
    - "help me partition logs.otel.linux"
    - "give me different partition suggestions" (pass the previous result via previous_suggestions)

    **When NOT to use:**
    - The user already knows the exact name and condition for a child — go straight to the create partition tool.
    - Inspecting the current routing: use the inspect streams tool with aspects: ["routing"] instead.
    - Classic streams: partitioning is wired-stream only.

    **How time range is chosen:**
    - The tool discovers the actual data range by querying min/max @timestamp on the stream.
    - The range is capped to the last 7 days. If the stream has no recent data, the tool returns a reason explaining why no suggestions could be made.

    **Existing routing:** The stream's current children are returned alongside the suggestions (\`existing_partitions\`). They are NOT affected by anything this tool does. Always present both the existing and proposed partitions to the user so they can see what is already in place. If the user asks to remove or change an existing partition, use the delete stream tool on that child (routing edits to existing children are not supported through suggestions).

    **Result:** Returns \`partitions\` (proposed new) and \`existing_partitions\` (current routes), or a \`reason\` when none can be suggested (\`no_clusters\`, \`no_samples\`, \`all_data_partitioned\`). The result is marked \`status: 'suggestion_not_applied'\` — present it to the user, then use the create partition tool for accepted new partitions.
  `),
  tags: ['streams'],
  schema: suggestPartitionsSchema,
  handler: async (
    { stream_name: streamName, user_prompt: userPrompt, previous_suggestions: previousSuggestions },
    { request, modelProvider }
  ) => {
    const log = logger.get('suggest_partitions');
    try {
      const { streamsClient, scopedClusterClient, getFeatureClient } = await getScopedClients({
        request,
      });
      const esClient = scopedClusterClient.asCurrentUser;
      const model = await modelProvider.getDefaultModel();

      const definition = await streamsClient.getStream(streamName);
      if (!Streams.WiredStream.Definition.is(definition)) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Partition suggestions are only available for wired streams. "${streamName}" is not a wired ingest stream.`,
                stream: streamName,
                operation: 'suggest_partitions',
                likely_cause: 'unsupported_stream_type',
              },
            },
          ],
        };
      }

      // Pull the stream's actual existing children so the agent can present a
      // before/after view to the user. We only surface enabled routes — the
      // disabled ones wouldn't affect routing today and reporting them would
      // mislead the user about the current state.
      const existingPartitions = definition.ingest.wired.routing
        .filter((route) => route.status !== 'disabled')
        .map((route) => ({ name: route.destination, condition: route.where }));

      const range = await discoverTimeRange(esClient, streamName);
      if (!range) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: streamName,
                partitions: [],
                existing_partitions: existingPartitions,
                reason: 'no_samples' as const,
                status: 'suggestion_not_applied' as const,
                note: `No recent documents found in "${streamName}". Cannot suggest partitions without sample data — confirm the stream is receiving traffic.`,
              },
            },
          ],
        };
      }

      const compositeAbort = new AbortController();
      const requestSignal = abortSignalFromRequest(request);
      const timeoutSignal = AbortSignal.timeout(SUGGEST_PARTITIONS_TIMEOUT_MS);
      const cleanup = () => compositeAbort.abort();
      requestSignal.addEventListener('abort', cleanup);
      timeoutSignal.addEventListener('abort', cleanup);

      try {
        log.debug(
          `Calling partitionStream (stream=${streamName} start=${range.start} end=${
            range.end
          } hasUserPrompt=${Boolean(userPrompt)} existingRoutes=${
            existingPartitions.length
          } previousSuggestions=${previousSuggestions?.length ?? 0})`
        );

        // The streams-ai workflow already excludes documents matching enabled
        // routes from its clustering pool, so we don't repeat those here.
        // `existingPartitions` on the workflow is an iteration vector for "do
        // not re-suggest these"; we feed it the previously-suggested set from
        // the agent (when refining) so we don't get the same proposals back.
        const suggestion = await partitionStream({
          definition,
          inferenceClient: model.inferenceClient,
          esClient,
          logger: log,
          start: range.start,
          end: range.end,
          maxSteps: SUGGEST_PARTITIONS_MAX_STEPS,
          signal: compositeAbort.signal,
          userPrompt,
          existingPartitions: previousSuggestions,
          getFeatures: async (filters) => {
            const featureClient = await getFeatureClient();
            const { hits } = await featureClient.getFeatures(streamName, filters);
            return hits;
          },
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: streamName,
                partitions: suggestion.partitions,
                existing_partitions: existingPartitions,
                ...(suggestion.reason && { reason: suggestion.reason }),
                time_range: range,
                status: 'suggestion_not_applied' as const,
                note: "These are proposed NEW partitions. The stream's existing partitions are listed under existing_partitions and are not affected by this suggestion. Present both lists to the user, then use the create partition tool for each accepted new partition.",
              },
            },
          ],
        };
      } finally {
        requestSignal.removeEventListener('abort', cleanup);
        timeoutSignal.removeEventListener('abort', cleanup);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to suggest partitions for stream "${streamName}": ${message}`,
              stream: streamName,
              operation: 'suggest_partitions',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});

interface DiscoveredRange {
  start: number;
  end: number;
}

/**
 * Query the stream index for `min`/`max @timestamp` and clamp the result to
 * the last {@link TIME_RANGE_CAP_MS} so the clustering step stays cheap on
 * very long-lived streams. Returns `null` when the index has no data the
 * caller can sample from.
 */
const discoverTimeRange = async (
  esClient: ElasticsearchClient,
  streamName: string
): Promise<DiscoveredRange | null> => {
  const response = await esClient.search<
    unknown,
    {
      min_ts: { value: number | null };
      max_ts: { value: number | null };
    }
  >({
    index: streamName,
    size: 0,
    track_total_hits: false,
    aggs: {
      min_ts: { min: { field: '@timestamp' } },
      max_ts: { max: { field: '@timestamp' } },
    },
    ignore_unavailable: true,
  });

  const minTs = response.aggregations?.min_ts.value;
  const maxTs = response.aggregations?.max_ts.value;

  if (typeof minTs !== 'number' || typeof maxTs !== 'number' || maxTs <= 0) {
    return null;
  }

  const cappedStart = Math.max(minTs, maxTs - TIME_RANGE_CAP_MS);
  if (cappedStart >= maxTs) {
    // Defensive: if min == max, widen by a fallback window so partitionStream
    // still has a non-degenerate range to work with.
    return { start: maxTs - FALLBACK_TIME_RANGE_MS, end: maxTs };
  }

  return { start: cappedStart, end: maxTs };
};
