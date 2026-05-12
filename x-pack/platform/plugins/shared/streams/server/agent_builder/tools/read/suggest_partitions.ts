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
import { type Condition, conditionSchema, conditionToQueryDsl } from '@kbn/streamlang';
import { partitionStream } from '@kbn/streams-ai';
import type { GetScopedClients } from '../../../routes/types';
import { isMlTierAvailable } from '../../../routes/utils/assert_ml_tier_access';
import type { StreamsServer } from '../../../types';
import { STREAMS_SUGGEST_PARTITIONS_TOOL_ID } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { abortSignalFromRequest } from '../../utils/write_queue';

const SUGGEST_PARTITIONS_MAX_STEPS = 4;
const SUGGEST_PARTITIONS_TIMEOUT_MS = 3 * 60 * 1000;
const TIME_RANGE_CAP_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_TIME_RANGE_MS = 24 * 60 * 60 * 1000;
/**
 * Lower bound on the size of the unrouted document pool we'll consider before
 * spending an LLM call on clustering. Anything below this is unlikely to
 * produce stable clusters and is surfaced to the agent as
 * `insufficient_samples` so it can ask the user for more data instead of
 * presenting weak partitions as if they were grounded suggestions.
 */
const MIN_SAMPLE_COUNT = 50;

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
  server: StreamsServer;
  logger: Logger;
}

export const createSuggestPartitionsTool = ({
  getScopedClients,
  server,
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
    - The tool discovers the actual data range by querying min/max @timestamp on the unrouted document pool (documents not already covered by enabled child routes).
    - Window *width* is capped at 7 days but *anchored at the most recent unrouted document*, not at "now" — streams that stopped weeks ago still get clustered on their tail data instead of being reported as empty.
    - The single-distinct-timestamp degenerate case (e.g. a brand-new stream with one doc) is widened by 24 hours so downstream sampling has a non-zero window.
    - If fewer than ${MIN_SAMPLE_COUNT} unrouted documents exist within the chosen window, the tool returns \`reason: 'insufficient_samples'\` with the actual count.

    **Existing routing:** The stream's current children are returned alongside the suggestions (\`existing_partitions\`). They are NOT affected by anything this tool does. Always present both the existing and proposed partitions to the user so they can see what is already in place. If the user asks to remove or change an existing partition, use the delete stream tool on that child (routing edits to existing children are not supported through suggestions).

    **Result:** Returns \`partitions\` (proposed new) and \`existing_partitions\` (current routes), or a \`reason\` when none can be suggested (\`no_clusters\`, \`no_samples\`, \`insufficient_samples\`, \`all_data_partitioned\`). The result is marked \`status: 'suggestion_not_applied'\` — present it to the user, then use the create partition tool for accepted new partitions. When \`previous_suggestions_dropped\` is present, surface to the user that those names already exist as real child routes and were ignored.
  `),
  tags: ['streams'],
  schema: suggestPartitionsSchema,
  handler: async (
    { stream_name: streamName, user_prompt: userPrompt, previous_suggestions: previousSuggestions },
    { request, modelProvider }
  ) => {
    const log = logger.get('suggest_partitions');
    // Pricing-tier entitlement gate. Mirrors the check that the equivalent
    // HTTP route (`POST /internal/streams/{name}/_suggest_partitions`)
    // enforces — without it, the agent surface would bypass an entitlement the
    // UI honors. We `return` instead of `throw` so the chat renders a clean
    // tool-error result instead of a stack trace.
    if (!isMlTierAvailable({ server })) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Partition suggestions via the Streams agent are not available on the current pricing tier.',
              stream: streamName,
              operation: 'suggest_partitions',
              likely_cause: 'pricing_tier_unavailable',
            },
          },
        ],
      };
    }

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
      // mislead the user about the current state. Routing conditions for these
      // are also used as exclusions everywhere else in the flow: the time-range
      // discovery query excludes them so the chosen window reflects the
      // actual clusterable pool, and the workflow excludes them again before
      // sampling.
      const enabledChildRoutes = definition.ingest.wired.routing.filter(
        (route) => route.status !== 'disabled'
      );
      const existingPartitions = enabledChildRoutes.map((route) => ({
        name: route.destination,
        condition: route.where,
      }));
      const existingPartitionNames = new Set(existingPartitions.map((p) => p.name));
      const enabledChildConditions = enabledChildRoutes.map((route) => route.where);

      // Drop any `previous_suggestions` whose name collides with a real
      // existing child route. "previous_suggestions" by definition means
      // unapplied; if a name collides with a disk-stored route the agent's
      // state is wrong, and feeding the workflow that suggestion produces
      // an empty cluster (matching docs are also in the exclusion set).
      // Surface the dropped names so the agent can correct the user.
      const filteredPreviousSuggestions = (previousSuggestions ?? []).filter(
        (s) => !existingPartitionNames.has(s.name)
      );
      const previousSuggestionsDropped = (previousSuggestions ?? [])
        .filter((s) => existingPartitionNames.has(s.name))
        .map((s) => s.name);
      if (previousSuggestionsDropped.length > 0) {
        log.debug(
          `Dropping ${previousSuggestionsDropped.length} previous_suggestions whose name collides with existing routes` +
            ` (stream=${streamName} dropped=${previousSuggestionsDropped.join(',')})`
        );
      }

      const range = await discoverTimeRange(esClient, streamName, enabledChildConditions);
      if (range.kind === 'no_samples') {
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
                note: `No unrouted documents found in "${streamName}". Cannot suggest data-driven partitions without sample data — confirm the stream is receiving traffic that isn't already covered by existing child routes. If the user already knows how they want to split this stream, define the partition manually with the create partition tool instead.`,
                ...(previousSuggestionsDropped.length > 0 && {
                  previous_suggestions_dropped: previousSuggestionsDropped,
                }),
              },
            },
          ],
        };
      }
      if (range.kind === 'insufficient_samples') {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: streamName,
                partitions: [],
                existing_partitions: existingPartitions,
                reason: 'insufficient_samples' as const,
                sample_count: range.totalDocs,
                minimum_required: MIN_SAMPLE_COUNT,
                status: 'suggestion_not_applied' as const,
                note: `Only ${range.totalDocs} unrouted document(s) found in the chosen window of "${streamName}". Data-driven partition suggestions need at least ${MIN_SAMPLE_COUNT} unrouted documents to find meaningful clusters. Either wait for more data, or — if the user already knows how they want to split this stream — define the partition manually with the create partition tool instead.`,
                ...(previousSuggestionsDropped.length > 0 && {
                  previous_suggestions_dropped: previousSuggestionsDropped,
                }),
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
          } previousSuggestions=${filteredPreviousSuggestions.length})`
        );

        // The streams-ai workflow excludes documents matching enabled routes
        // from its clustering pool internally, so we don't repeat that here.
        // The `previousSuggestions` argument is the iteration vector for
        // refinement — the LLM gets to see prior proposals so it can keep,
        // modify, or replace them — and is distinct from the stream's real
        // disk-stored routes (which we surface as `existing_partitions` on
        // the response).
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
          previousSuggestions: filteredPreviousSuggestions,
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
                time_range: { start: range.start, end: range.end },
                status: 'suggestion_not_applied' as const,
                note: "These are proposed NEW partitions. The stream's existing partitions are listed under existing_partitions and are not affected by this suggestion. Present both lists to the user, then use the create partition tool for each accepted new partition.",
                ...(previousSuggestionsDropped.length > 0 && {
                  previous_suggestions_dropped: previousSuggestionsDropped,
                }),
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

type DiscoveredRange =
  | { kind: 'ok'; start: number; end: number }
  | { kind: 'no_samples' }
  | { kind: 'insufficient_samples'; totalDocs: number };

/**
 * Pick a clustering window over the *unrouted* document pool of a wired
 * stream and verify the window holds enough samples for clustering to be
 * meaningful.
 *
 * `excludeConditions` is the set of enabled child-route conditions from the
 * stream definition. We apply them everywhere we touch ES so the chosen
 * window and the sample-count floor both reflect the documents the workflow
 * will actually cluster on — not docs that are already routed away.
 * Disabled routes are intentionally ignored: they don't affect ingest
 * routing today.
 *
 * Two ES queries (both `size: 0`):
 *
 * 1. **Range discovery** — `min`/`max @timestamp` of the unrouted pool with
 *    no time bound. Lets us locate the actual data extent regardless of how
 *    long ago the stream last received traffic. The window we use is
 *    `[max(minTs, maxTs - TIME_RANGE_CAP_MS), maxTs]` — the *width* is
 *    capped at {@link TIME_RANGE_CAP_MS} for cost (clustering is O(samples)
 *    over the window), but we anchor at `maxTs` rather than wall-clock
 *    `now` so streams that stopped a month ago still get clustered on
 *    their tail data instead of being incorrectly reported as
 *    "no recent data".
 * 2. **Floor check** — count unrouted docs *within* the chosen window with
 *    `track_total_hits: MIN_SAMPLE_COUNT`. ES returns
 *    `{ value, relation }` and lets us decide "below threshold" vs
 *    "at or above threshold" without paying for an exact count on large
 *    streams.
 *
 * Returns a discriminated result so the caller can distinguish:
 * - `'no_samples'`: no unrouted documents at all (fresh stream, or all
 *   traffic is routed away).
 * - `'insufficient_samples'`: fewer than {@link MIN_SAMPLE_COUNT} unrouted
 *   docs in the chosen window — not worth spending an LLM call on; the
 *   agent should pivot the user to manual `create_partition` (with an
 *   explicit condition) or wait for more data.
 * - `'ok'`: a usable `{ start, end }` window. The single-distinct-timestamp
 *   degenerate case (e.g. a brand-new stream with one doc, or all docs at
 *   the same ms) is widened by {@link FALLBACK_TIME_RANGE_MS} so downstream
 *   sampling code never gets a zero-width range.
 */
const discoverTimeRange = async (
  esClient: ElasticsearchClient,
  streamName: string,
  excludeConditions: Condition[]
): Promise<DiscoveredRange> => {
  const mustNot = excludeConditions.map((condition) => conditionToQueryDsl(condition));
  const baseBool = mustNot.length > 0 ? { must_not: mustNot } : {};

  const rangeResponse = await esClient.search<
    unknown,
    {
      min_ts: { value: number | null };
      max_ts: { value: number | null };
    }
  >({
    index: streamName,
    size: 0,
    track_total_hits: false,
    query: { bool: baseBool },
    aggs: {
      min_ts: { min: { field: '@timestamp' } },
      max_ts: { max: { field: '@timestamp' } },
    },
    ignore_unavailable: true,
  });

  const minTs = rangeResponse.aggregations?.min_ts.value;
  const maxTs = rangeResponse.aggregations?.max_ts.value;
  if (typeof minTs !== 'number' || typeof maxTs !== 'number' || maxTs <= 0) {
    return { kind: 'no_samples' };
  }

  // Cap window *width* at TIME_RANGE_CAP_MS but anchor at maxTs (not `now`)
  // so dormant streams still get a window over their tail data.
  let start = Math.max(minTs, maxTs - TIME_RANGE_CAP_MS);
  // Single-distinct-timestamp degenerate case (single doc, or all docs at
  // the same ms): widen so downstream sampling doesn't divide by zero.
  // Multi-doc but narrow windows (e.g. a 60s burst) are left alone —
  // clustering doesn't care about absolute width, only doc count and
  // content patterns.
  if (start === maxTs) {
    start = maxTs - FALLBACK_TIME_RANGE_MS;
  }

  const countResponse = await esClient.search<unknown, never>({
    index: streamName,
    size: 0,
    track_total_hits: MIN_SAMPLE_COUNT,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': { gte: start, lte: maxTs, format: 'epoch_millis' },
            },
          },
        ],
        ...baseBool,
      },
    },
    ignore_unavailable: true,
  });

  const totalRaw = countResponse.hits.total;
  const totalDocs = typeof totalRaw === 'number' ? totalRaw : totalRaw?.value ?? 0;
  if (totalDocs < MIN_SAMPLE_COUNT) {
    return { kind: 'insufficient_samples', totalDocs };
  }

  return { kind: 'ok', start, end: maxTs };
};
