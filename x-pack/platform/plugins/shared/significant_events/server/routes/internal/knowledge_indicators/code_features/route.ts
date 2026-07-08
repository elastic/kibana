/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { getStreamSamplingSource, type Streams } from '@kbn/streams-schema';
import {
  deriveKnowledgeIndicatorSource,
  SignificantEventsWorkflowStatus,
  type Feature,
  type QueryLink,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { STREAMS_API_PRIVILEGES } from '@kbn/streams-plugin/common/constants';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../../../../lib/knowledge_indicators/fields';
import type { KIBulkOperation } from '../../../../lib/knowledge_indicators/knowledge_indicator_client';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../utils/resolve_connector_for_feature';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import {
  createCodeRepositoryReader,
  identifyCodeFeatures,
  identifyCodeFeaturesForService,
  identifyCodeQueries,
  reconcileCodeAndLogQueries,
  linkServiceEntities,
  type StreamSamplingSource,
} from '../../../../lib/knowledge_indicators/code_intelligence';

/** Whether a KI carries code evidence (code-derived or corroborated by code). */
const hasCodeSource = (evidence: string[] | undefined, source: string | undefined): boolean => {
  const resolved = source ?? deriveKnowledgeIndicatorSource(evidence);
  return resolved === 'code' || resolved === 'both';
};

/**
 * Lists the real streams and the index/pattern each one's data lives in, used to
 * resolve which stream ingests a given `service.name`.
 */
const listStreamSamplingSources = async (streamsClient: {
  listStreams: () => Promise<Streams.all.Definition[]>;
}): Promise<StreamSamplingSource[]> => {
  const definitions = await streamsClient.listStreams();
  const sources: StreamSamplingSource[] = [];
  for (const definition of definitions) {
    try {
      const index = getStreamSamplingSource(definition);
      if (index) {
        sources.push({ name: definition.name, index });
      }
    } catch {
      // Streams without a resolvable sampling source can't be probed; skip.
    }
  }
  return sources;
};

// ---------------------------------------------------------------------------
// Identify code-driven Feature KIs for a single stream (Stage 1).
//
// Backs the scheduled continuous code-KI extraction managed workflow. Derives
// `repo_type`, `language`, and `service_name` features from the stream's
// SCS-indexed repository, tagged with code evidence, and reconciles them with
// existing features. No-ops when the repository is unchanged since the last run.
// ---------------------------------------------------------------------------

const identifyCodeFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/code_features/_identify',
  options: {
    access: 'internal',
    summary: 'Identify code-driven KI features for a stream from its indexed repository',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z
      .object({
        runId: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamsClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const routeLogger = logger.get('code_features', streamName);
    const { runId = uuidv4() } = params.body ?? {};

    // Code feature identification requires the SCS Agent Builder tools to read
    // the source. When Agent Builder is unavailable, there is nothing to do.
    const agentBuilderTools = server.agentBuilder?.tools;
    if (!agentBuilderTools) {
      routeLogger.debug('Agent Builder tools unavailable; skipping code feature identification');
      return { status: 'no_repo' as const };
    }

    const [kiClient, stream] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      streamsClient.getStream(streamName),
    ]);

    const reader = createCodeRepositoryReader({
      esClient: scopedClusterClient.asCurrentUser,
      agentBuilderTools,
      request,
      logger: routeLogger,
    });

    return identifyCodeFeatures({
      streamName,
      samplingIndex: getStreamSamplingSource(stream),
      kiClient,
      reader,
      logger: routeLogger,
      runId,
    });
  },
});

// ---------------------------------------------------------------------------
// Generate predictive Query KIs for a stream from its logger call sites (Stage 2).
//
// Consumes the Stage 1 `service_name` Feature KI as the join key and the
// `tags: logging` code chunks (elastic/semantic-code-search#168) to build
// predictive match queries — including for log lines not yet seen in the data.
// Persisted as durable, non-rule-backed (draft) Query KIs.
// ---------------------------------------------------------------------------

const generateCodeQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/code_features/_generate_queries',
  options: {
    access: 'internal',
    summary: 'Generate predictive KI queries for a stream from its indexed logger call sites',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamsClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const routeLogger = logger.get('code_queries', streamName);

    const agentBuilderTools = server.agentBuilder?.tools;
    if (!agentBuilderTools) {
      routeLogger.debug('Agent Builder tools unavailable; skipping code query generation');
      return { status: 'no_repo' as const };
    }

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const esClient = scopedClusterClient.asCurrentUser;

    const reader = createCodeRepositoryReader({
      esClient,
      agentBuilderTools,
      request,
      logger: routeLogger,
    });

    const streams = await listStreamSamplingSources(streamsClient);

    return identifyCodeQueries({
      serviceName: streamName,
      streams,
      kiClient,
      reader,
      esClient,
      logger: routeLogger,
    });
  },
});

// ---------------------------------------------------------------------------
// Reconcile Query KIs across sources (code vs logs).
//
// Finds semantically equivalent queries (regardless of source or ES|QL
// phrasing) and merges each duplicate cluster into one canonical query carrying
// both code and log evidence; duplicates are tombstoned. Idempotent.
// ---------------------------------------------------------------------------

const reconcileCodeQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/code_features/_reconcile_queries',
  options: {
    access: 'internal',
    summary: 'Reconcile duplicate Query KIs across code and log sources for a stream',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    return reconcileCodeAndLogQueries({
      streamName,
      kiClient,
      logger: logger.get('reconcile_queries', streamName),
    });
  },
});

// ---------------------------------------------------------------------------
// Code Intelligence availability: is any Semantic Code Search code index present
// in the cluster? Used by the UI to show an onboarding placeholder (prompting
// the user to ingest code via SCS) versus the code intelligence content.
// ---------------------------------------------------------------------------

const codeIntelligenceAvailabilityRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_availability',
  options: {
    access: 'internal',
    summary: 'Check whether any Semantic Code Search code indices exist in the cluster',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ available: boolean }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    try {
      const resolved = await scopedClusterClient.asCurrentUser.indices.resolveIndex({
        name: 'code-*',
        expand_wildcards: 'open',
      });
      // SCS creates `code-*` chunk indices alongside `*_locations` / `*_settings`
      // helper indices; a real codebase requires at least one non-helper index.
      const available = resolved.indices.some(
        (index) => !index.name.endsWith('_locations') && !index.name.endsWith('_settings')
      );
      return { available };
    } catch (error) {
      logger.debug(
        `code_intelligence: availability check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { available: false };
    }
  },
});

// ---------------------------------------------------------------------------
// List code-derived Knowledge Indicators (cross-stream). Enumerates every
// KI-bearing stream — including the service-name pseudo-streams that code
// features are keyed by (which the real-stream-scoped `_features` route does not
// cover) — and returns the code-sourced features and queries. Powers the
// discovery Code Intelligence tab.
// ---------------------------------------------------------------------------

const listCodeKnowledgeIndicatorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_knowledge_indicators',
  options: {
    access: 'internal',
    summary: 'List code-derived Knowledge Indicators (features and queries) across all streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[]; queries: QueryLink[] }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
    if (streamNames.length === 0) {
      return { features: [], queries: [] };
    }

    const [{ hits: allFeatures }, links] = await Promise.all([
      // Fetch all features across every KI-bearing stream, then keep the ones
      // carrying code evidence — this includes `code_analysis` features (repo
      // type, language) and `entity`/`service` features the code merged onto.
      kiClient.getFeatures(streamNames, { includeExcluded: true, limit: 10_000 }),
      kiClient.getQueryLinks(streamNames, { ruleUnbacked: 'include' }),
    ]);

    const features = allFeatures.filter((feature) =>
      hasCodeSource(feature.evidence, feature.source)
    );
    const queries = links.filter((link) => hasCodeSource(link.query.evidence, link.query.source));

    return { features, queries };
  },
});

// ---------------------------------------------------------------------------
// Reset: delete every code-derived Feature KI across all streams.
//
// Removes all `code_analysis` features (including excluded ones), which also
// clears the stored change fingerprint — so a subsequent run re-derives features
// from scratch instead of no-opping. Intended for iterating on the extraction
// workflow: wipe, re-run, inspect what the agent returns. Log-derived KIs and
// Query KIs are left untouched.
// ---------------------------------------------------------------------------

const resetCodeFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_reset',
  options: {
    access: 'internal',
    summary: 'Delete all code-derived Feature KIs across every stream',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ deleted: number; streamsAffected: number }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const routeLogger = logger.get('code_intelligence', 'reset');
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
    if (streamNames.length === 0) {
      return { deleted: 0, streamsAffected: 0 };
    }

    // Delete every code-sourced KI (any feature type + queries) so the next run
    // regenerates from scratch. Deletes match on the stored id, so features use
    // their `uuid` and queries use `query.id`. Grouped per stream for bulk.
    const [{ hits: allFeatures }, links] = await Promise.all([
      kiClient.getFeatures(streamNames, {
        includeExcluded: true,
        includeExpired: true,
        limit: 10_000,
      }),
      kiClient.getQueryLinks(streamNames, { ruleUnbacked: 'include' }),
    ]);

    const opsByStream = new Map<string, KIBulkOperation[]>();
    const addOp = (stream: string, op: KIBulkOperation) => {
      const ops = opsByStream.get(stream) ?? [];
      ops.push(op);
      opsByStream.set(stream, ops);
    };

    for (const feature of allFeatures) {
      if (hasCodeSource(feature.evidence, feature.source)) {
        addOp(feature.stream_name, { delete: { type: KI_TYPE_FEATURE, id: feature.uuid } });
      }
    }
    for (const link of links) {
      if (hasCodeSource(link.query.evidence, link.query.source)) {
        addOp(link.stream_name, { delete: { type: KI_TYPE_QUERY, id: link.query.id } });
      }
    }

    let deleted = 0;
    const affected = new Set<string>();
    for (const [streamName, ops] of opsByStream) {
      const { applied } = await kiClient.bulk(streamName, ops);
      deleted += applied;
      if (applied > 0) {
        affected.add(streamName);
      }
    }

    routeLogger.info(
      `code_intelligence: reset removed ${deleted} code knowledge indicator(s) across ${affected.size} stream(s)`
    );

    return { deleted, streamsAffected: affected.size };
  },
});

// ---------------------------------------------------------------------------
// Identify code intelligence for a single agent-resolved service (Stage 1 +
// Stage 2 + reconcile), code-first — no logs required.
//
// Called by the "Continuous Code KI Extraction" managed workflow: its
// `ai.agent` step (`scs.code_researcher`) enumerates the deployable services
// across the SCS-indexed repositories, and the workflow fans out one call per
// `{ repository, service }` here. Service enumeration is owned by the agent
// (it reasons over the repo layout) rather than by directory-name parsing.
// ---------------------------------------------------------------------------

const identifyServiceRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_identify_service',
  options: {
    access: 'internal',
    summary: 'Identify code KI features and predictive queries for one agent-resolved service',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      repository: z.string(),
      service: z.object({
        name: z.string(),
        language: z.string().optional(),
        evidence: z
          .array(
            z.object({
              path: z.string(),
              line: z.number().optional(),
              snippet: z.string().optional(),
            })
          )
          .nullish(),
      }),
      runId: z.string().optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{
    status: 'updated' | 'noop' | 'no_repo';
    streamName: string;
    featuresPersisted: number;
    queriesGenerated: number;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, uiSettingsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { repository, service, runId = uuidv4() } = params.body;
    const routeLogger = logger.get('code_intelligence', 'identify_service', service.name);

    const agentBuilderTools = server.agentBuilder?.tools;
    if (!agentBuilderTools) {
      routeLogger.debug('Agent Builder tools unavailable; skipping service identification');
      return {
        status: 'no_repo',
        streamName: service.name,
        featuresPersisted: 0,
        queriesGenerated: 0,
      };
    }

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const reader = createCodeRepositoryReader({
      esClient: scopedClusterClient.asCurrentUser,
      agentBuilderTools,
      request,
      logger: routeLogger,
    });

    // Stage 1: derive code Feature KIs (repo type, language, predicted service name).
    const featureResult = await identifyCodeFeaturesForService({
      repository,
      serviceName: service.name,
      language: service.language,
      evidence: service.evidence ?? undefined,
      kiClient,
      reader,
      logger: routeLogger,
      runId,
    });

    const esClient = scopedClusterClient.asCurrentUser;
    const streams = await listStreamSamplingSources(scopedClients.streamsClient);

    // Stage 2: generate predictive Query KIs from the service's logger call
    // sites, written to the real stream(s) that ingest the service.
    const queryResult = await identifyCodeQueries({
      serviceName: featureResult.streamName,
      streams,
      kiClient,
      reader,
      esClient,
      logger: routeLogger,
    });

    // Reconcile code- and log-derived Query KIs on each ingesting stream that
    // now carries code queries (semantic dedup merges the two sources).
    for (const streamName of queryResult.streams ?? []) {
      await reconcileCodeAndLogQueries({ streamName, kiClient, logger: routeLogger });
    }

    // Represent the service as an entity/service KI on the ingesting stream(s),
    // merging with any matching log-derived entity. Runs every time (even on a
    // code no-op) so it tracks log entities that appear after the code was
    // analyzed.
    try {
      await linkServiceEntities({
        serviceName: featureResult.streamName,
        repository,
        fingerprint: featureResult.fingerprint,
        citations: service.evidence ?? undefined,
        streams,
        esClient,
        kiClient,
        runId,
        logger: routeLogger,
      });
    } catch (error) {
      routeLogger.debug(
        `code_intelligence: service entity linkage failed for "${featureResult.streamName}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return {
      status: featureResult.status,
      streamName: featureResult.streamName,
      featuresPersisted: featureResult.features?.length ?? 0,
      queriesGenerated: queryResult.status === 'generated' ? queryResult.generatedCount ?? 0 : 0,
    };
  },
});

// ---------------------------------------------------------------------------
// Run code intelligence across all SCS-indexed repositories on demand.
//
// Triggers the managed "Continuous Code KI Extraction" workflow for the current
// space (singleton per space — reuses a running execution). The workflow's
// `ai.agent` step enumerates services and fans out to `_identify_service`, so
// this returns immediately with the execution id rather than blocking on the
// full run. Backs the discovery Code Intelligence tab "Identify features &
// queries" button.
// ---------------------------------------------------------------------------

const runCodeIntelligenceRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_run',
  options: {
    access: 'internal',
    summary: 'Trigger the code intelligence extraction workflow across all indexed repositories',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
  }): Promise<{ executionId: string; isNew: boolean }> => {
    const { codeExtractionClient } = workflowClients;
    if (!codeExtractionClient) {
      throw new FeatureNotEnabledError(
        'Code intelligence extraction requires the workflows feature to be enabled'
      );
    }

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const spaceId = await getSpaceId(request);
    const agentConnectorId = await resolveConnectorForSignificantEventsDiscovery({
      searchInferenceEndpoints: server.searchInferenceEndpoints,
      request,
    });

    return codeExtractionClient.run({ request, spaceId, inputs: { agentConnectorId } });
  },
});

// ---------------------------------------------------------------------------
// Reconcile KIs across every stream on demand.
//
// Runs the cross-source Query KI reconciler (semantic dedup of code- vs
// log-derived queries) for every stream that has KIs, and refreshes each code
// service's ingesting-stream linkage. Deterministic and LLM-free (semantic
// matching over stored embeddings), so it runs synchronously and returns
// aggregate counts. Backs the discovery tab "Reconcile KIs" button.
// ---------------------------------------------------------------------------

const reconcileKnowledgeIndicatorsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_reconcile',
  options: {
    access: 'internal',
    summary: 'Reconcile duplicate Query KIs across sources and refresh stream linkage',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{
    streamsReconciled: number;
    clustersMerged: number;
    queriesTombstoned: number;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const routeLogger = logger.get('code_intelligence', 'reconcile');
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
    if (streamNames.length === 0) {
      return { streamsReconciled: 0, clustersMerged: 0, queriesTombstoned: 0 };
    }

    let streamsReconciled = 0;
    let clustersMerged = 0;
    let queriesTombstoned = 0;

    for (const streamName of streamNames) {
      try {
        const result = await reconcileCodeAndLogQueries({
          streamName,
          kiClient,
          logger: routeLogger,
        });
        streamsReconciled += 1;
        clustersMerged += result.clustersMerged;
        queriesTombstoned += result.queriesTombstoned;
      } catch (error) {
        routeLogger.warn(
          `code_intelligence: reconcile failed for stream "${streamName}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return { streamsReconciled, clustersMerged, queriesTombstoned };
  },
});

// ---------------------------------------------------------------------------
// Status of the latest code intelligence extraction workflow run for the space.
// Powers the discovery tab's live progress + auto-refresh while a run proceeds.
// ---------------------------------------------------------------------------

const codeIntelligenceRunStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_run_status',
  options: {
    access: 'internal',
    summary: 'Get the status of the latest code intelligence extraction workflow run',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
  }): Promise<SignificantEventsWorkflowStatusResult> => {
    const { codeExtractionClient } = workflowClients;
    if (!codeExtractionClient) {
      return { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null };
    }

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const spaceId = await getSpaceId(request);
    return codeExtractionClient.getStatus({ spaceId });
  },
});

export const internalKICodeFeaturesRoutes = {
  ...identifyCodeFeaturesRoute,
  ...generateCodeQueriesRoute,
  ...reconcileCodeQueriesRoute,
  ...codeIntelligenceAvailabilityRoute,
  ...listCodeKnowledgeIndicatorsRoute,
  ...identifyServiceRoute,
  ...runCodeIntelligenceRoute,
  ...codeIntelligenceRunStatusRoute,
  ...reconcileKnowledgeIndicatorsRoute,
  ...resetCodeFeaturesRoute,
};
