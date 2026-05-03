/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  QueriesGetResponse,
  QueriesOccurrencesGetResponse,
  SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { generatedSignificantEventQuerySchema } from '@kbn/streams-schema';
import { sortForQueriesTable } from '../../../../lib/sig_events/utils';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { generateKIQueries } from '../../../../lib/sig_events/ki_queries_generation_service';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { queryStatusSchema, toRuleUnbackedFilter } from '../../../utils/query_status';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/sig_events/read_significant_events_from_alerts_indices';
import { searchModeSchema } from '../../../utils/search_mode';
import type { PersistQueriesResult } from '../../../../lib/sig_events/persist_queries';
import { persistQueries } from '../../../../lib/sig_events/persist_queries';

const dateFromString = z.string().transform((input) => new Date(input));

const baseRequestParamsSchema = z.object({
  from: dateFromString.describe('Start of the time range'),
  to: dateFromString.describe('End of the time range'),
  bucketSize: z.string().describe('Size of time buckets for aggregation'),
  query: z.string().optional().describe('Query string to filter significant events queries'),
  streamNames: z
    .preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string()))
    .optional()
    .describe('Stream names to filter significant events'),
});

const requestParamsSchema = baseRequestParamsSchema.extend({
  searchMode: searchModeSchema,
});

export const getUnbackedQueriesCountRoute = createServerRoute({
  endpoint: 'GET /internal/streams/queries/_unbacked_count',
  options: {
    access: 'internal',
    summary: 'Count unbacked queries across streams',
    description:
      'Returns the count of stored significant-events queries across all streams that do not yet have a backing Kibana rule.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        minSeverityScore: z.coerce.number().int().min(0).max(100).optional(),
      })
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ count: number }> => {
    const { getQueryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const queryClient = await getQueryClient();
    const minSeverityScore = params?.query?.minSeverityScore;
    const count = await queryClient.countPromotableUnbackedQueries({ minSeverityScore });
    return { count };
  },
});

/**
 * Promotes unbacked queries to rule-backed status. Returns
 * `{ promoted, skipped_stats }`. Since STATS queries are filtered at
 * candidate selection (see `QueryClient.promoteUnbackedQueries`),
 * `skipped_stats` is reliably `0` on this route and is retained only for
 * response-shape stability.
 */
export const promoteUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_promote',
  options: {
    access: 'internal',
    summary: 'Promote unbacked queries',
    description:
      'Creates Kibana rules for stored queries across streams that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        queryIds: z.array(z.string()).optional(),
        minSeverityScore: z.number().int().min(0).max(100).optional(),
      })
      .nullish(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ promoted: number; skipped_stats: number }> => {
    const { getQueryClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const queryClient = await getQueryClient();
    const streamDefinitions = new Map(
      (await streamsClient.listStreams()).map((definition) => [definition.name, definition])
    );

    return queryClient.promoteUnbackedQueries({
      queryIds: params?.body?.queryIds,
      minSeverityScore: params?.body?.minSeverityScore,
      streamDefinitions,
    });
  },
});

export const demoteBackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_demote',
  options: {
    access: 'internal',
    summary: 'Demote backed queries',
    description:
      'Removes Kibana rules for the provided stored significant-events queries and marks them as unbacked.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string()).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ demoted: number }> => {
    const { getQueryClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const queryClient = await getQueryClient();
    // Only rule-backed queries can be demoted; unbacked queries have no rule to remove.
    const toDemote = await queryClient.getQueryLinks([], {
      ruleUnbacked: 'exclude',
      queryIds: params.body.queryIds,
    });

    const byStream = toDemote.reduce<Record<string, string[]>>((acc, link) => {
      const stream = link.stream_name;

      if (!acc[stream]) {
        acc[stream] = [];
      }

      acc[stream].push(link.query.id);
      return acc;
    }, {});

    const streamDefinitions = await streamsClient.listStreams();
    const streamDefinitionsByName = new Map(
      streamDefinitions.map((streamDefinition) => [streamDefinition.name, streamDefinition])
    );

    let demoted = 0;

    for (const [streamName, queryIds] of Object.entries(byStream)) {
      const definition = streamDefinitionsByName.get(streamName);
      if (!definition) {
        logger.warn(`Skipping demotion for missing stream ${streamName}`);
        continue;
      }
      const result = await queryClient.demoteQueries(definition, queryIds);
      demoted += result.demoted;
    }

    return { demoted };
  },
});

export const bulkDeleteQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_bulk_delete',
  options: {
    access: 'internal',
    summary: 'Bulk delete queries across streams',
    description:
      'Hard-deletes stored significant-events queries across multiple streams in a single request. Removes backing Kibana rules for any backed queries.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string()).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ succeeded: number; failed: number; skipped: number }> => {
    const { getQueryClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const queryClient = await getQueryClient();

    // Bulk delete must cover both backed and unbacked queries; the default
    // 'exclude' filter would skip unbacked (draft) ones.
    const queryLinks = await queryClient.getQueryLinks([], {
      queryIds: params.body.queryIds,
      ruleUnbacked: 'include',
    });

    // Count requested IDs that getQueryLinks did not find — these are idempotent
    // no-ops (already gone / never existed) and reported as `skipped`, not failed.
    const foundIds = new Set(queryLinks.map((link) => link.query.id));
    const skipped = params.body.queryIds.filter((id) => !foundIds.has(id)).length;

    // Capture backed rule IDs per stream to log on mid-flight failure.
    const byStream = new Map<string, { queryIds: string[]; backedRuleIds: string[] }>();
    for (const link of queryLinks) {
      const bucket = byStream.get(link.stream_name) ?? { queryIds: [], backedRuleIds: [] };
      bucket.queryIds.push(link.query.id);
      if (link.rule_backed && link.rule_id) {
        bucket.backedRuleIds.push(link.rule_id);
      }
      byStream.set(link.stream_name, bucket);
    }

    // Fetch only the stream definitions we actually need. Rejections (e.g. the
    // stream definition no longer exists) are treated the same way as the old
    // `listStreams() + Map.get === undefined` check: that stream's batch is
    // counted as failed below.
    const streamNames = Array.from(byStream.keys());
    const streamDefinitionResults = await Promise.allSettled(
      streamNames.map((name) => streamsClient.getStream(name))
    );
    const streamDefinitionsByName = new Map<
      string,
      Awaited<ReturnType<typeof streamsClient.getStream>>
    >();
    streamDefinitionResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        streamDefinitionsByName.set(streamNames[i], result.value);
      }
    });

    // syncQueries uninstalls rules before writing storage, so a mid-flight
    // throw can leave rules gone while stored links still reference them. Log
    // the backed rule IDs on failure so ops can reconcile manually.
    const sigEventsLogger = logger.get('significant_events');

    let succeeded = 0;
    let failed = 0;

    for (const [streamName, { queryIds, backedRuleIds }] of byStream) {
      const definition = streamDefinitionsByName.get(streamName);
      if (!definition) {
        logger.warn(`Skipping bulk delete for missing stream ${streamName}`);
        failed += queryIds.length;
        continue;
      }
      try {
        await queryClient.bulk(
          definition,
          queryIds.map((id) => ({ delete: { id } }))
        );
        succeeded += queryIds.length;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const orphanContext =
          backedRuleIds.length > 0 ? ` candidateOrphanedRuleIds=[${backedRuleIds.join(',')}]` : '';
        sigEventsLogger.error(
          `Bulk delete failed for stream ${streamName}: ${errorMessage}. ` +
            `queryIds=[${queryIds.join(',')}]${orphanContext}`
        );
        failed += queryIds.length;
      }
    }

    return { succeeded, failed, skipped };
  },
});

const getDiscoveryQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries',
  params: z.object({
    query: requestParamsSchema.extend({
      page: z.coerce.number().int().min(1).optional().describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items per page'),
      status: queryStatusSchema,
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read paginated significant-event queries for the discovery table',
    description: 'Returns significant-event queries as table rows, with server-side pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<QueriesGetResponse> => {
    const { getQueryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      from,
      to,
      bucketSize,
      query,
      streamNames,
      page = 1,
      perPage = 10,
      status,
      searchMode,
    } = params.query;

    const queryClient = await getQueryClient();
    const { significant_events: queries } = await readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
        filters: { ruleUnbacked: toRuleUnbackedFilter(status) },
        searchMode,
      },
      { queryClient, scopedClusterClient }
    );

    const sortedQueries = sortForQueriesTable(queries);
    const total = queries.length;
    const start = (page - 1) * perPage;
    const queriesPage = start >= total ? [] : sortedQueries.slice(start, start + perPage);

    return { queries: queriesPage, page, perPage, total };
  },
});

// Uses baseRequestParamsSchema (no searchMode) intentionally: the histogram
// is an aggregate summary, not a list of individual queries. It always uses
// the default search mode so occurrences reflect the best-available ranking.
const getDiscoveryQueriesOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/_occurrences',
  params: z.object({
    query: baseRequestParamsSchema,
  }),
  options: {
    access: 'internal',
    summary: 'Read aggregated occurrences for the discovery histogram',
    description:
      'Returns the aggregated occurrences histogram series for the chart above the queries table.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<QueriesOccurrencesGetResponse> => {
    const { getQueryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames } = params.query;

    const queryClient = await getQueryClient();
    const { aggregated_occurrences: aggregatedOccurrenceBuckets } =
      await readSignificantEventsFromAlertsIndices(
        {
          from,
          to,
          bucketSize,
          query,
          streamNames,
        },
        { queryClient, scopedClusterClient }
      );

    const occurrencesHistogram = aggregatedOccurrenceBuckets.map((bucket) => ({
      x: bucket.date,
      y: bucket.count,
    }));

    const totalOccurrences = aggregatedOccurrenceBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );

    return { occurrences_histogram: occurrencesHistogram, total_occurrences: totalOccurrences };
  },
});

const generateQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/queries/_generate',
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    body: z
      .object({
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID override. When omitted the connector is resolved via the Inference Feature Registry.'
          ),
        maxExistingQueriesForContext: z
          .number()
          .optional()
          .describe('Max number of existing queries to include as context for the LLM.'),
      })
      .nullish(),
  }),
  options: {
    access: 'internal',
    summary: 'Generate significant events queries',
    description: 'Runs a single iteration of KI queries generation for the given stream.',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    telemetry,
  }): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> => {
    const {
      streamsClient,
      inferenceClient,
      soClient,
      getFeatureClient,
      getQueryClient,
      scopedClusterClient,
      licensing,
      uiSettingsClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const { connectorId, maxExistingQueriesForContext } = params.body ?? {};

    const [featureClient, queryClient] = await Promise.all([getFeatureClient(), getQueryClient()]);

    const result = await generateKIQueries(
      { streamName, connectorId, maxExistingQueriesForContext },
      {
        streamsClient,
        inferenceClient,
        soClient,
        featureClient,
        queryClient,
        esClient: scopedClusterClient.asCurrentUser,
        uiSettingsClient,
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        request,
        logger: logger.get('significant_events_queries_generation'),
        signal: getRequestAbortSignal(request),
        telemetry,
      }
    );

    return {
      queries: result.queries,
      tokensUsed: result.tokensUsed,
      connectorId: result.connectorId,
    };
  },
});

const persistQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/queries/_persist',
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    body: z.object({
      queries: z.array(generatedSignificantEventQuerySchema),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Persist generated queries with deduplication',
    description:
      'Persists generated significant event queries for a stream, deduplicating by ES|QL and handling rule-backed replacements.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<PersistQueriesResult> => {
    const { streamsClient, getQueryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const { queries } = params.body;
    const queryClient = await getQueryClient();

    return persistQueries(streamName, queries, { queryClient, streamsClient });
  },
});

export const internalQueriesRoutes = {
  ...getUnbackedQueriesCountRoute,
  ...promoteUnbackedQueriesRoute,
  ...demoteBackedQueriesRoute,
  ...bulkDeleteQueriesRoute,
  ...getDiscoveryQueriesRoute,
  ...getDiscoveryQueriesOccurrencesRoute,
  ...generateQueriesRoute,
  ...persistQueriesRoute,
};
