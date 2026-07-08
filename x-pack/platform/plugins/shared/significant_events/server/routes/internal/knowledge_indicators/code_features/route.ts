/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { getStreamSamplingSource } from '@kbn/streams-schema';
import { CODE_ANALYSIS_FEATURE_TYPE } from '@kbn/significant-events-schema';
import { STREAMS_API_PRIVILEGES } from '@kbn/streams-plugin/common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import {
  createCodeRepositoryReader,
  identifyCodeFeatures,
  identifyCodeQueries,
  reconcileCodeAndLogQueries,
  CODE_FEATURE_SUBTYPE_LANGUAGE,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
} from '../../../../lib/knowledge_indicators/code_intelligence';

export interface CodeIntelligenceRepository {
  repository: string;
  /** Whether the repository currently has an SCS code index in the cluster. */
  indexed: boolean;
  repo_type?: string;
  language?: string;
  service_name?: string;
  service_predicted?: boolean;
  /** The stream whose code features describe this repository, if any. */
  stream_name?: string;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

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

    return identifyCodeQueries({ stream, kiClient, reader, logger: routeLogger });
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
// Code Intelligence repositories overview (cross-stream): lists SCS-indexed
// repositories joined with the code features (repo type, language, service name)
// derived from them, plus the stream each maps to. Powers the discovery hub tab.
// ---------------------------------------------------------------------------

const listCodeRepositoriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_repositories',
  options: {
    access: 'internal',
    summary: 'List Semantic Code Search repositories with their derived code intelligence',
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
  }): Promise<{ repositories: CodeIntelligenceRepository[] }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const esClient = scopedClusterClient.asCurrentUser;

    // 1. Distinct repositories indexed by Semantic Code Search.
    const indexedRepositories = new Set<string>();
    try {
      const response = await esClient.search(
        {
          index: 'code-*',
          size: 0,
          track_total_hits: false,
          aggs: { repositories: { terms: { field: 'repository', size: 1000 } } },
        },
        { ignore: [404] }
      );
      const buckets =
        (response.aggregations?.repositories as { buckets?: Array<{ key: string }> })?.buckets ??
        [];
      for (const bucket of buckets) {
        if (typeof bucket.key === 'string' && bucket.key.length > 0) {
          indexedRepositories.add(bucket.key);
        }
      }
    } catch (error) {
      logger.debug(
        `code_intelligence: repository listing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // 2. Join with code features derived across all streams.
    const byRepository = new Map<string, CodeIntelligenceRepository>();
    try {
      const kiClient = await scopedClients.getKnowledgeIndicatorClient();
      const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
      if (streamNames.length > 0) {
        const { hits } = await kiClient.getFeatures(streamNames, {
          type: [CODE_ANALYSIS_FEATURE_TYPE],
        });
        for (const feature of hits) {
          const repository = asString(feature.properties?.repository);
          if (!repository) {
            continue;
          }
          const row = byRepository.get(repository) ?? {
            repository,
            indexed: indexedRepositories.has(repository),
          };
          row.stream_name = row.stream_name ?? feature.stream_name;
          if (feature.subtype === CODE_FEATURE_SUBTYPE_REPO_TYPE) {
            row.repo_type = asString(feature.properties?.repo_type);
          } else if (feature.subtype === CODE_FEATURE_SUBTYPE_LANGUAGE) {
            row.language = asString(feature.properties?.language);
          } else if (feature.subtype === CODE_FEATURE_SUBTYPE_SERVICE_NAME) {
            row.service_name = asString(feature.properties?.service_name);
            row.service_predicted = feature.properties?.predicted === true;
          }
          byRepository.set(repository, row);
        }
      }
    } catch (error) {
      logger.debug(
        `code_intelligence: code feature join failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // 3. Surface indexed repositories that have not been analyzed into a stream yet.
    for (const repository of indexedRepositories) {
      if (!byRepository.has(repository)) {
        byRepository.set(repository, { repository, indexed: true });
      }
    }

    const repositories = [...byRepository.values()].sort((a, b) =>
      a.repository.localeCompare(b.repository)
    );

    return { repositories };
  },
});

export const internalKICodeFeaturesRoutes = {
  ...identifyCodeFeaturesRoute,
  ...generateCodeQueriesRoute,
  ...reconcileCodeQueriesRoute,
  ...codeIntelligenceAvailabilityRoute,
  ...listCodeRepositoriesRoute,
};
