/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import pLimit from 'p-limit';
import type {
  QueriesGetResponse,
  QueriesOccurrencesGetResponse,
  SignificantEventsQueriesGenerationResult,
  StreamQuery,
} from '@kbn/significant-events-schema';
import {
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  generatedSignificantEventQuerySchema,
  upsertStreamQueryRequestSchema,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { deriveQueryType, MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { sortQueryLinksForTable } from '../../../../lib/significant_events/utils';
import { generateKIQueries } from '../../../../lib/significant_events/ki_queries_generation_service';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { queryStatusSchema, toRuleUnbackedFilter } from '../../../utils/query_status';
import { BUCKET_SIZE_PATTERN } from '../../../../lib/significant_events/helpers/fill_bucket_gaps';
import { createSignificantEventsTracedEsClient } from '../../../../lib/significant_events/create_significant_events_traced_es_client';
import {
  computeOccurrences,
  fetchQueryLinks,
  getQueryOccurrences,
  toQueryWithOccurrences,
  type QueryOccurrences,
} from '../../../../lib/significant_events/fetch_query_occurrences_from_alerts';
import { searchModeSchema } from '../../../utils/search_mode';
import { assertValidDateRange, makeIsoDateFromString } from '../../../utils/iso_date_param';
import { resolveStreamNames } from '../../../utils/resolve_stream_names';
import type { PersistQueriesResult } from '../../../../lib/significant_events/persist_queries';
import { persistQueries } from '../../../../lib/significant_events/persist_queries';
import { queryFromLink } from '../../../../lib/knowledge_indicators/knowledge_indicator_client/serializers';
import type {
  KnowledgeIndicatorClient,
  PromoteQueriesResult,
} from '../../../../lib/knowledge_indicators';
import { cleanupStaleEvents } from '../../../../lib/significant_events/events/cleanup_stale_events';
import { QueryNotFoundError } from '../../../../lib/errors/query_not_found_error';
import { validateEsqlQueryForStreamOrThrow } from '../../../../lib/significant_events/validate_esql_query';

const RECONCILE_STREAM_CONCURRENCY = 3;
// Manual repair endpoint: keep each request small so operators batch large migrations explicitly.
const RECONCILE_MAX_STREAMS = 10;
// Leave five minutes under the route's idle-socket limit for an in-flight
// validation call and the agent's forced-completion turn to finish.
const QUERY_GENERATION_MAX_DURATION_MS = 300_000;

const dateFromString = makeIsoDateFromString('ISO 8601 datetime');

const baseRequestParamsSchema = z.object({
  from: dateFromString.describe('Start of the time range'),
  to: dateFromString.describe('End of the time range'),
  bucketSize: z
    .string()
    .max(MAX_ID_LENGTH)
    .regex(BUCKET_SIZE_PATTERN)
    .describe('Size of time buckets for aggregation'),
  query: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Query string to filter significant events queries'),
  streamNames: z
    .preprocess(
      (val) => (typeof val === 'string' ? [val] : val),
      z.array(z.string().max(MAX_ID_LENGTH))
    )
    .optional()
    .describe('Stream names to filter significant events'),
});

const requestParamsSchema = baseRequestParamsSchema.extend({
  searchMode: searchModeSchema,
});

/**
 * Promotes unbacked queries to rule-backed status. Ineligible queries are
 * skipped and counted by reason: `skipped_stats` for STATS (unbacked until
 * #265778) and `skipped_ineligible` for MATCH that is not filter-only. The two
 * are reported separately so the UI can tell the user which one they hit.
 */
const promoteUnbackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_promote',
  options: {
    access: 'internal',
    summary: 'Promote unbacked queries',
    description:
      'Creates Kibana rules for stored queries across streams that do not yet have a backing rule, then marks them as backed.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        queryIds: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
        minSeverityScore: z.number().int().min(0).max(100).optional(),
      })
      .nullish(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<PromoteQueriesResult> => {
    const scopedClients = await getScopedClients({ request });
    const { streamsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    // Streams are the source universe until nightshift-program#1307 swaps in the sources catalog.
    const sourceIds = (await streamsClient.listStreams()).map((definition) => definition.name);

    return kiClient.promoteUnbackedQueries({
      queryIds: params?.body?.queryIds,
      minSeverityScore: params?.body?.minSeverityScore,
      sourceIds,
    });
  },
});

const demoteBackedQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_demote',
  options: {
    access: 'internal',
    summary: 'Demote backed queries',
    description:
      'Removes Kibana rules for the provided stored significant-events queries and marks them as unbacked.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string().max(MAX_ID_LENGTH)).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
  }): Promise<{ demoted: number }> => {
    const scopedClients = await getScopedClients({ request });
    const { streamsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    // Only rule-backed queries can be demoted; unbacked queries have no rule to remove.
    const toDemote = await kiClient.getQueryLinks([], {
      ruleUnbacked: 'exclude',
      queryIds: params.body.queryIds,
      includeExpired: true,
    });

    const bySource = toDemote.reduce<Record<string, string[]>>((acc, link) => {
      const sourceId = link.stream_name;

      if (!acc[sourceId]) {
        acc[sourceId] = [];
      }

      acc[sourceId].push(link.query.id);
      return acc;
    }, {});

    const knownSourceIds = new Set(
      (await streamsClient.listStreams()).map((definition) => definition.name)
    );

    let demoted = 0;

    for (const [sourceId, queryIds] of Object.entries(bySource)) {
      if (!knownSourceIds.has(sourceId)) {
        logger.warn(`Skipping demotion for missing source ${sourceId}`);
        continue;
      }
      const result = await kiClient.demoteQueries(sourceId, queryIds);
      demoted += result.demoted;
    }

    return { demoted };
  },
});

const bulkDeleteQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_bulk_delete',
  options: {
    access: 'internal',
    summary: 'Bulk delete queries across streams',
    description:
      'Hard-deletes stored significant-events queries across multiple streams in a single request. Removes backing Kibana rules for any backed queries.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      queryIds: z.array(z.string().max(MAX_ID_LENGTH)).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ succeeded: number; failed: number; skipped: number }> => {
    const scopedClients = await getScopedClients({ request });
    const { streamsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    // Intentionally not guarded by assertNotPaused: bulk delete is teardown
    // (removes queries/rules), which stays allowed while paused — same as
    // disabling scheduled discovery / continuous onboarding.

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    // Bulk delete must cover both backed and unbacked queries; the default 'exclude'
    // filter would skip unbacked (draft) ones. includeExpired: explicit-id action, so
    // an expired query must stay reachable.
    const queryLinks = await kiClient.getQueryLinks([], {
      queryIds: params.body.queryIds,
      ruleUnbacked: 'include',
      includeExpired: true,
    });

    // Count requested IDs that getQueryLinks did not find — these are idempotent
    // no-ops (already gone / never existed) and reported as `skipped`, not failed.
    const foundIds = new Set(queryLinks.map((link) => link.query.id));
    const skipped = params.body.queryIds.filter((id) => !foundIds.has(id)).length;

    // Capture backed rule IDs per source to log on mid-flight failure.
    const bySource = new Map<string, { queryIds: string[]; backedRuleIds: string[] }>();
    for (const link of queryLinks) {
      const bucket = bySource.get(link.stream_name) ?? { queryIds: [], backedRuleIds: [] };
      bucket.queryIds.push(link.query.id);
      if (link.rule_backed && link.rule_id) {
        bucket.backedRuleIds.push(link.rule_id);
      }
      bySource.set(link.stream_name, bucket);
    }

    // Check only the sources we actually need. A source that no longer exists
    // (streams are the source universe until nightshift-program#1307) gets its
    // batch counted as failed below. `getStream` also enforces the read privilege.
    const sourceIds = Array.from(bySource.keys());
    const sourceExistence = await Promise.allSettled(
      sourceIds.map((sourceId) => streamsClient.getStream(sourceId))
    );
    const existingSourceIds = new Set(
      sourceIds.filter((_, index) => sourceExistence[index].status === 'fulfilled')
    );

    // deleteQueries uninstalls rules before writing storage, so a mid-flight
    // throw can leave rules gone while stored links still reference them. Log
    // the backed rule IDs on failure so ops can reconcile manually.
    const sigEventsLogger = logger.get('significantEvents');

    let succeeded = 0;
    let failed = 0;
    const candidateRuleIds = new Set<string>();

    for (const [sourceId, { queryIds, backedRuleIds }] of bySource) {
      if (!existingSourceIds.has(sourceId)) {
        logger.warn(`Skipping bulk delete for missing source ${sourceId}`);
        failed += queryIds.length;
        continue;
      }
      try {
        await kiClient.deleteQueries(sourceId, queryIds);
        backedRuleIds.forEach((ruleId) => candidateRuleIds.add(ruleId));
        succeeded += queryIds.length;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const orphanContext =
          backedRuleIds.length > 0 ? ` candidateOrphanedRuleIds=[${backedRuleIds.join(',')}]` : '';
        sigEventsLogger.error(
          `Bulk delete failed for source ${sourceId}: ${errorMessage}. ` +
            `queryIds=[${queryIds.join(',')}]${orphanContext}`
        );
        failed += queryIds.length;
      }
    }

    if (candidateRuleIds.size > 0) {
      try {
        const { rulesClient } = await scopedClients.getSignificantEventsAlertingContext();
        await cleanupStaleEvents({
          eventClient: await scopedClients.getEventClient(),
          rulesClient,
          candidateRuleIds: [...candidateRuleIds],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sigEventsLogger.error(
          `Failed to clean up significant events after bulk query deletion: ${errorMessage}`
        );
      }
    }

    return { succeeded, failed, skipped };
  },
});

const reconcileQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/queries/_reconcile',
  options: {
    access: 'internal',
    summary: 'Reconcile rule-backed queries',
    description:
      'Re-syncs stored rule-backed queries through the current rule scheduling policy in the current space.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      streamNames: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(RECONCILE_MAX_STREAMS),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
  }): Promise<{
    reconciled: number;
    failed: number;
    streams: Array<{
      streamName: string;
      status: 'reconciled' | 'failed';
      queries: number;
      error?: string;
    }>;
  }> => {
    const authUser = server.core.security.authc.getCurrentUser(request);
    const cloneApiKeysOnCreate = authUser?.authentication_type === 'api_key';
    const scopedClients = await getScopedClients({
      request,
      rulesClientOptions: { cloneApiKeysOnCreate },
    });
    const { streamsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { streamNames } = params.body;
    const existence = await Promise.allSettled(
      streamNames.map((streamName) => streamsClient.getStream(streamName))
    );
    const limiter = pLimit(RECONCILE_STREAM_CONCURRENCY);

    const streams = await Promise.all(
      existence.map((result, index) =>
        limiter(async () => {
          const streamName = streamNames[index];
          if (result.status === 'rejected') {
            const error =
              result.reason instanceof Error ? result.reason.message : String(result.reason);
            logger.warn(`Skipping query reconciliation for missing stream ${streamName}: ${error}`);
            return { streamName, status: 'failed' as const, queries: 0, error };
          }

          let reconciledQueries = 0;
          try {
            await kiClient.replaceStreamQueries(streamName, (currentLinks) => {
              reconciledQueries = currentLinks.filter((link) => link.rule_backed).length;
              return currentLinks.map(queryFromLink);
            });
            return {
              streamName,
              status: 'reconciled' as const,
              queries: reconciledQueries,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`Query reconciliation failed for stream ${streamName}: ${errorMessage}`);
            return {
              streamName,
              status: 'failed' as const,
              queries: reconciledQueries,
              error: errorMessage,
            };
          }
        })
      )
    );

    return {
      reconciled: streams.filter((stream) => stream.status === 'reconciled').length,
      failed: streams.filter((stream) => stream.status === 'failed').length,
      streams,
    };
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
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
  }): Promise<QueriesGetResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

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
    assertValidDateRange(from, to);

    const resolvedStreamNames = await resolveStreamNames(streamNames, () =>
      scopedClients.streamsClient.listStreams()
    );

    const [kiClient, { alertsReader }] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    const queryLinks = await fetchQueryLinks(
      {
        streamNames: resolvedStreamNames,
        query,
        filters: { ruleUnbacked: toRuleUnbackedFilter(status) },
        searchMode,
      },
      kiClient
    );

    // Paginate links first, then fetch occurrences for the page's rules only —
    // not the full (up to 10k) set.
    const total = queryLinks.length;
    const start = (page - 1) * perPage;
    const pageLinks =
      start >= total ? [] : sortQueryLinksForTable(queryLinks).slice(start, start + perPage);
    const pageRuleIds = [...new Set(pageLinks.map((link) => link.rule_id))];
    const spaceId = await getSpaceId(request);
    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });

    const occurrences = await computeOccurrences(
      { ruleIds: pageRuleIds, from, to, bucketSize, spaceId, alertsReader },
      { esClient }
    );
    const queryOccurrences: QueryOccurrences = { queryLinks: pageLinks, ...occurrences };
    const queriesPage = pageLinks.map((queryLink) =>
      toQueryWithOccurrences({ queryLink, queryOccurrences })
    );

    return { queries: queriesPage, page, perPage, total };
  },
});

// baseRequestParamsSchema (no searchMode): the histogram is an aggregate,
// always default-ranked, not a list of individual queries.
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
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
  }): Promise<QueriesOccurrencesGetResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const { from, to, bucketSize, query, streamNames } = params.query;
    assertValidDateRange(from, to);

    const resolvedStreamNames = await resolveStreamNames(streamNames, () =>
      scopedClients.streamsClient.listStreams()
    );

    const [kiClient, { alertsReader }] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const { aggregatedOccurrences: aggregatedOccurrenceBuckets } = await getQueryOccurrences(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames: resolvedStreamNames,
        alertsReader,
        spaceId: await getSpaceId(request),
      },
      { kiClient, esClient }
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
      streamName: z.string().max(MAX_ID_LENGTH).describe('The name of the stream'),
    }),
    body: z
      .object({
        connectorId: z
          .string()
          .max(MAX_ID_LENGTH)
          .optional()
          .describe(
            'Optional connector ID override. When omitted the connector is resolved via the Inference Feature Registry.'
          ),
        maxExistingQueriesForContext: z
          .number()
          .optional()
          .describe('Max number of existing queries to include as context for the LLM.'),
        queryValidationTimeoutMs: z
          .number()
          .int()
          .min(1_000)
          .max(240_000)
          .optional()
          .describe(
            'Per-query deadline (ms) for the ES|QL validation step. When omitted the server-side tuning default is used.'
          ),
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
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
    logger,
    telemetry,
  }): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> => {
    const scopedClients = await getScopedClients({ request });
    const {
      streamsClient,
      inferenceClient,
      scopedClusterClient,
      streamDataEsClient,
      licensing,
      tuningConfig,
    } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;
    const {
      connectorId,
      maxExistingQueriesForContext,
      queryValidationTimeoutMs = tuningConfig.query_validation_timeout_ms,
    } = params.body ?? {};

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    const result = await generateKIQueries(
      {
        streamName,
        connectorId,
        maxExistingQueriesForContext,
        maxDurationMs: QUERY_GENERATION_MAX_DURATION_MS,
        queryValidationTimeoutMs,
      },
      {
        streamsClient,
        inferenceClient,
        kiClient,
        esClient: scopedClusterClient.asCurrentUser,
        streamDataEsClient,
        featureFlags: server.core.featureFlags,
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        request,
        logger: logger.get('significant_events_queries_generation'),
        signal: getRequestAbortSignal(request),
        telemetry,
        agentBuilderTools: server.agentBuilder?.tools,
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
      streamName: z.string().max(MAX_ID_LENGTH).describe('The name of the stream'),
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
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<PersistQueriesResult> => {
    const authUser = server.core.security.authc.getCurrentUser(request);
    const cloneApiKeysOnCreate = authUser?.authentication_type === 'api_key';
    const scopedClients = await getScopedClients({
      request,
      rulesClientOptions: { cloneApiKeysOnCreate },
    });
    const { streamsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;
    const { queries } = params.body;
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    return persistQueries(streamName, queries, {
      kiClient,
      streamsClient,
    });
  },
});

const upsertQueryRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/queries/{queryId}',
  options: {
    access: 'internal',
    summary: 'Upsert a significant-events query',
    description:
      'Creates or updates a stored significant-events query. When `target_name` is omitted, the stream is resolved from the existing query link.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      queryId: z.string().max(MAX_ID_LENGTH).describe('The identifier of the query.'),
    }),
    body: upsertStreamQueryRequestSchema.extend({
      target_name: z
        .string()
        .min(1)
        .max(MAX_STREAM_NAME_LENGTH)
        .optional()
        .describe(
          'Optional analysis target (stream name). Required when creating a query; omitted updates resolve the target from the existing query.'
        ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<{ acknowledged: boolean }> => {
    const authUser = server.core.security.authc.getCurrentUser(request);
    const cloneApiKeysOnCreate = authUser?.authentication_type === 'api_key';
    const scopedClients = await getScopedClients({
      request,
      rulesClientOptions: { cloneApiKeysOnCreate },
    });
    const { streamsClient, licensing } = scopedClients;
    const {
      path: { queryId },
      body: { target_name: targetName, ...queryBody },
    } = params;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const sourceId = targetName ?? (await resolveExistingQuerySourceId(kiClient, queryId));
    // The source id is the stream name until nightshift-program#1307, so it doubles as the
    // stream whose definition the ES|QL is validated against.
    const definition = await streamsClient.getStream(sourceId);

    validateEsqlQueryForStreamOrThrow({
      esqlQuery: queryBody.esql.query,
      stream: definition,
    });

    const query: StreamQuery = {
      ...queryBody,
      id: queryId,
      type: deriveQueryType(queryBody.esql.query),
    };
    await kiClient.upsertQuery(sourceId, query);

    return { acknowledged: true };
  },
});

async function resolveExistingQuerySourceId(
  kiClient: KnowledgeIndicatorClient,
  queryId: string
): Promise<string> {
  // Empty source list means "no source filter"; include expired and unbacked so
  // an omitted target_name can still resolve an existing query for update.
  const [existing] = await kiClient.getQueryLinks([], {
    queryIds: [queryId],
    ruleUnbacked: 'include',
    includeExpired: true,
  });
  if (!existing) {
    throw new QueryNotFoundError(`Query [${queryId}] not found`);
  }
  return existing.stream_name;
}

export const internalKIQueriesRoutes = {
  ...promoteUnbackedQueriesRoute,
  ...demoteBackedQueriesRoute,
  ...bulkDeleteQueriesRoute,
  ...reconcileQueriesRoute,
  ...getDiscoveryQueriesRoute,
  ...getDiscoveryQueriesOccurrencesRoute,
  ...generateQueriesRoute,
  ...persistQueriesRoute,
  ...upsertQueryRoute,
};
