/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import {
  getStreamSamplingSource,
  isOtelStream,
  normalizeEsqlSafe,
  Streams,
} from '@kbn/streams-schema';
import {
  deriveKnowledgeIndicatorSource,
  SignificantEventsWorkflowStatus,
  SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  type Feature,
  type QueryLink,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { STREAMS_API_PRIVILEGES } from '@kbn/streams-plugin/common/constants';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../../../../lib/knowledge_indicators/fields';
import type {
  KIBulkOperation,
  KnowledgeIndicatorClient,
} from '../../../../lib/knowledge_indicators/knowledge_indicator_client';
import { REVISION_SIZE_LIMIT } from '../../../../lib/knowledge_indicators/knowledge_indicator_client/revision_reader';
import type { SignificantEventsCodeExtractionClient } from '../../../../lib/workflows/code_extraction_workflow_client';
import {
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  FALLBACK_LOG_STREAM,
} from '../../../../lib/knowledge_indicators/code_intelligence/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import { StatusError } from '../../../../lib/errors/status_error';
import { SignificantEventsPausedError } from '../../../../lib/errors/significant_events_paused_error';
import {
  identifyCodeFeaturesForService,
  identifyCodeQueries,
  getCodeFeatureStreamPrefix,
  reconcileCodeAndLogQueries,
  linkServiceEntities,
  discoverLoggingSites,
  classifyLoggingSites,
  extractOtelSignalsResult,
  generateOtelQueries,
  classifyOtelSignals,
  resolveSignalStreams,
  listIndexedRepos,
  discoverCandidateRoots,
  buildLanguageHistogram,
  detectOtelInstrumentationForRoots,
  classifyServices,
  type ServiceCandidateRoot,
  type IacSignal,
  type LanguageCount,
  type DiscoveredService,
  type OtelDetection,
  type ServiceCodeMetadata,
  type StreamSamplingSource,
} from '../../../../lib/knowledge_indicators/code_intelligence';

/** Whether a KI carries code evidence (code-derived or corroborated by code). */
const hasCodeSource = (
  evidence: string[] | undefined,
  source: ('code' | 'logs')[] | undefined
): boolean => {
  const resolved = source ?? deriveKnowledgeIndicatorSource(evidence);
  return resolved.includes('code');
};

/**
 * Whether a KI is *purely* code-derived (no log evidence). Used by reset so that
 * deleting "code features" never destroys a KI that also carries log evidence
 * (a merged `both` KI) — those are left intact.
 */
const isPurelyCodeSource = (
  evidence: string[] | undefined,
  source: ('code' | 'logs')[] | undefined
): boolean => {
  const resolved = source ?? deriveKnowledgeIndicatorSource(evidence);
  return resolved.length === 1 && resolved[0] === 'code';
};

const isStaleTemplateQuery = (
  { query, rule_backed: ruleBacked }: QueryLink,
  serviceName: string,
  repository: string
): boolean =>
  !ruleBacked &&
  query.type === 'match' &&
  query.features?.some(({ id }) => id === CODE_FEATURE_SUBTYPE_SERVICE_NAME) === true &&
  query.description.startsWith('Predictive: log.') &&
  query.description.includes(`for service "${serviceName}"`) &&
  (query.evidence?.length ?? 0) > 0 &&
  query.evidence!.every((evidence) => evidence.startsWith(`code: ${repository}@`));

/** Removes only unpromoted, pure code template KIs once typed coverage exists. */
const removeStaleTemplateQueries = async ({
  streams,
  kiClient,
  serviceName,
  repository,
  authorizedStreamNames,
}: {
  streams: StreamSamplingSource[];
  kiClient: Pick<KnowledgeIndicatorClient, 'getStreamToQueryLinksMap' | 'bulk'>;
  serviceName: string;
  repository: string;
  authorizedStreamNames: Set<string>;
}): Promise<void> => {
  // Only clean the root `logs` fallback owner when the caller can access it.
  const fallbackOwners = authorizedStreamNames.has(FALLBACK_LOG_STREAM)
    ? [FALLBACK_LOG_STREAM]
    : [];
  const streamNames = [...new Set([...fallbackOwners, ...streams.map(({ name }) => name)])];
  for (const streamName of streamNames) {
    // The revision reader caps a combined request. Fetch 1 owner at a time so
    // large deployments cannot silently leave an old template behind.
    const { [streamName]: links = [] } = await kiClient.getStreamToQueryLinksMap([streamName]);
    const deletions = links
      .filter((link) => isStaleTemplateQuery(link, serviceName, repository))
      .map((link) => ({ delete: { type: KI_TYPE_QUERY, id: link.query.id } }));
    if (deletions.length > 0) {
      await kiClient.bulk(streamName, deletions);
    }
  }
};

const CODE_KNOWLEDGE_INDICATORS_LIMIT = REVISION_SIZE_LIMIT;
// Keep each synchronous destructive batch aligned with the existing bounded
// cross-stream reconciliation endpoint.
const CODE_INTELLIGENCE_OPERATION_BATCH_SIZE = 10;
const CODE_INTELLIGENCE_BULK_OPERATION_BATCH_SIZE = 1000;
const CODE_INTELLIGENCE_MAX_ARRAY_SIZE = 1_000;
const CODE_INTELLIGENCE_MAX_COUNT = Number.MAX_SAFE_INTEGER;

const codeIntelligenceInput = z.string().max(MAX_ID_LENGTH);
const codeIntelligenceTextInput = z.string().max(MAX_TEXT_LENGTH);

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
        sources.push({
          name: definition.name,
          index,
          convention: isOtelStream(definition) ? 'otel' : 'ecs',
          isQueryStream: Streams.QueryStream.Definition.is(definition),
        });
      }
    } catch {
      // Streams without a resolvable sampling source can't be probed; skip.
    }
  }
  return sources;
};

/**
 * The KI data stream is plugin-owned and read with an internal client. Restrict
 * every user-facing operation to stream definitions the request is authorized to
 * access before reading or mutating that global storage.
 */
const listAccessibleStreamNames = async (streamsClient: {
  listStreams: () => Promise<Array<{ name: string }>>;
}): Promise<string[]> => (await streamsClient.listStreams()).map(({ name }) => name);

/** Returns a stable, bounded stream batch and the cursor needed to resume it. */
/**
 * Code-analysis features have space-scoped virtual streams. They are safe to
 * combine with the request's real streams because the prefix is assigned at
 * write time from the execution space, not supplied by the caller.
 */
const listAuthorizedCodeKnowledgeIndicatorStreams = async ({
  kiClient,
  streamsClient,
  spaceId,
}: {
  kiClient: { getStreamNamesWithKnowledgeIndicators: () => Promise<string[]> };
  streamsClient: { listStreams: () => Promise<Array<{ name: string }>> };
  spaceId: string;
}): Promise<{ streamNames: string[]; isTruncated: boolean }> => {
  const [realStreams, allKiStreams] = await Promise.all([
    listAccessibleStreamNames(streamsClient),
    kiClient.getStreamNamesWithKnowledgeIndicators(),
  ]);
  const prefix = getCodeFeatureStreamPrefix(spaceId);
  return {
    streamNames: [
      ...new Set([...realStreams, ...allKiStreams.filter((name) => name.startsWith(prefix))]),
    ],
    isTruncated: allKiStreams.length === REVISION_SIZE_LIMIT,
  };
};

const getStreamBatch = (streamNames: string[], cursor: string | undefined) => {
  const sortedStreamNames = [...streamNames].sort();
  const remaining = sortedStreamNames.filter((streamName) => !cursor || streamName > cursor);
  const batch = remaining.slice(0, CODE_INTELLIGENCE_OPERATION_BATCH_SIZE);
  return {
    streamNames: batch,
    nextCursor:
      remaining.length > CODE_INTELLIGENCE_OPERATION_BATCH_SIZE ? batch.at(-1) : undefined,
  };
};

type CodeIntelligenceReadiness = { available: true } | { available: false; message: string };

/**
 * Verifies every dependency required by the managed code-extraction workflow.
 * Connector misconfiguration is a setup prerequisite; operational failures keep
 * their original error so callers render a retryable error rather than setup UI.
 */
const getCodeIntelligenceReadiness = async ({
  request,
  server,
  codeExtractionClient,
}: {
  request: KibanaRequest;
  server: {
    searchInferenceEndpoints?: Parameters<
      typeof resolveConnectorForFeature
    >[0]['searchInferenceEndpoints'];
  };
  codeExtractionClient: SignificantEventsCodeExtractionClient | undefined;
}): Promise<CodeIntelligenceReadiness> => {
  if (!codeExtractionClient || !(await codeExtractionClient.isInstalled())) {
    return {
      available: false,
      message: 'Code Intelligence extraction workflow is not installed.',
    };
  }
  try {
    await resolveConnectorForFeature({
      searchInferenceEndpoints: server.searchInferenceEndpoints,
      featureId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
      featureName: 'logging-site classification',
      request,
    });
    return { available: true };
  } catch (error) {
    if (error instanceof StatusError && error.statusCode === 400) {
      return { available: false, message: error.message };
    }
    throw error;
  }
};

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
    path: z.object({ streamName: codeIntelligenceInput }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
    maintenanceService,
  }) => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, streamsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { streamName } = params.path;

    // The KI store is plugin-owned and read with an internal client, so confirm
    // the caller can reach this stream before mutating its KIs. A real stream
    // must be listable by the scoped Streams client; a virtual code-feature
    // stream must belong to the caller's active space.
    const spaceId = await getSpaceId(request);
    const accessibleStreams = new Set(await listAccessibleStreamNames(streamsClient));
    if (
      !accessibleStreams.has(streamName) &&
      !streamName.startsWith(getCodeFeatureStreamPrefix(spaceId))
    ) {
      throw new StatusError(`Stream "${streamName}" is not accessible.`, 404);
    }

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    await assertNotPaused({ maintenanceService, request });

    return reconcileCodeAndLogQueries({
      streamName,
      kiClient,
      logger: logger.get('reconcile_queries', streamName),
    });
  },
});

// ---------------------------------------------------------------------------
// Code Intelligence availability. Ready when the managed workflow and the
// required service-discovery classifier connector are available. OTel query
// classification degrades to deterministic typed queries when unavailable.
// ---------------------------------------------------------------------------

const codeIntelligenceAvailabilityRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_availability',
  options: {
    access: 'internal',
    summary: 'Check whether the code-intelligence agent is installed',
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
    server,
    logger,
  }): Promise<{ available: boolean; message?: string }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const readiness = await getCodeIntelligenceReadiness({
      request,
      server,
      codeExtractionClient: workflowClients.codeExtractionClient,
    });
    return readiness.available ? { available: true } : readiness;
  },
});

// ---------------------------------------------------------------------------
// List code-derived Knowledge Indicators from streams the request can access.
// The KI data stream is global plugin storage, so pseudo-stream KIs without a
// caller-authorized stream definition are deliberately excluded. Powers the
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
    getSpaceId,
    server,
  }): Promise<{ features: Feature[]; queries: QueryLink[]; isTruncated: boolean }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { streamNames, isTruncated: streamEnumerationTruncated } =
      await listAuthorizedCodeKnowledgeIndicatorStreams({
        kiClient,
        streamsClient: scopedClients.streamsClient,
        spaceId: await getSpaceId(request),
      });
    if (streamNames.length === 0) {
      return { features: [], queries: [], isTruncated: streamEnumerationTruncated };
    }
    const [{ hits: allFeatures }, links] = await Promise.all([
      // Fetch bounded, caller-scoped data before applying the code-evidence
      // filter. A cap hit is explicitly reported as potentially incomplete.
      kiClient.getFeatures(streamNames, {
        includeExcluded: true,
        limit: CODE_KNOWLEDGE_INDICATORS_LIMIT,
      }),
      kiClient.getQueryLinks(streamNames, {
        ruleUnbacked: 'include',
        limit: CODE_KNOWLEDGE_INDICATORS_LIMIT,
      }),
    ]);

    const features = allFeatures.filter((feature) =>
      hasCodeSource(feature.evidence, feature.source)
    );
    const queries = links.filter((link) => hasCodeSource(link.query.evidence, link.query.source));

    return {
      features,
      queries,
      isTruncated:
        streamEnumerationTruncated ||
        allFeatures.length === CODE_KNOWLEDGE_INDICATORS_LIMIT ||
        links.length === CODE_KNOWLEDGE_INDICATORS_LIMIT,
    };
  },
});

// ---------------------------------------------------------------------------
// Service coverage distribution: how many services are known from code only,
// logs only, or both. Computed over `service` entity KIs across all streams,
// grouped by service name. Powers the Code Intelligence tab visualization.
// ---------------------------------------------------------------------------

const serviceDistributionRoute = createServerRoute({
  endpoint: 'GET /internal/streams/code_intelligence/_service_distribution',
  options: {
    access: 'internal',
    summary: 'Distribution of services known from code, logs, or both',
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
  }): Promise<{
    codeOnly: number;
    both: number;
    logsOnly: number;
    /** Names of services known from code but not yet observed in logs. */
    codeOnlyServices: string[];
    /** The bounded entity scan may omit additional services. */
    isTruncated: boolean;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const streamNames = await listAccessibleStreamNames(scopedClients.streamsClient);
    if (streamNames.length === 0) {
      return { codeOnly: 0, both: 0, logsOnly: 0, codeOnlyServices: [], isTruncated: false };
    }

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { hits } = await kiClient.getFeatures(streamNames, {
      type: ['entity'],
      includeExpired: true,
      limit: CODE_KNOWLEDGE_INDICATORS_LIMIT,
    });

    // Group service entities by name; a service can be represented by separate
    // code and log entities, or a single merged (`both`) one.
    const byService = new Map<string, { code: boolean; log: boolean }>();
    for (const feature of hits) {
      if (feature.subtype !== 'service') {
        continue;
      }
      const name =
        typeof feature.properties?.name === 'string' && feature.properties.name.length > 0
          ? feature.properties.name
          : feature.title;
      if (!name) {
        continue;
      }
      const source = feature.source ?? deriveKnowledgeIndicatorSource(feature.evidence);
      const entry = byService.get(name) ?? { code: false, log: false };
      entry.code = entry.code || source.includes('code');
      entry.log = entry.log || source.includes('logs');
      byService.set(name, entry);
    }

    let codeOnly = 0;
    let both = 0;
    let logsOnly = 0;
    const codeOnlyServices: string[] = [];
    for (const [name, { code, log }] of byService.entries()) {
      if (code && log) {
        both += 1;
      } else if (code) {
        codeOnly += 1;
        codeOnlyServices.push(name);
      } else if (log) {
        logsOnly += 1;
      }
    }

    codeOnlyServices.sort((a, b) => a.localeCompare(b));

    return {
      codeOnly,
      both,
      logsOnly,
      codeOnlyServices,
      isTruncated: hits.length === CODE_KNOWLEDGE_INDICATORS_LIMIT,
    };
  },
});

// ---------------------------------------------------------------------------
// Reset: delete every code-derived Feature KI across streams the request can access.
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
    summary: 'Delete all code-derived Feature KIs across accessible streams',
    timeout: { idleSocket: 300_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({ cursor: codeIntelligenceInput.optional() }).optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
    maintenanceService,
  }): Promise<{
    deleted: number;
    streamsAffected: number;
    failedStreams: string[];
    nextCursor?: string;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'reset');
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { streamNames: authorizedStreamNames, isTruncated: streamEnumerationTruncated } =
      await listAuthorizedCodeKnowledgeIndicatorStreams({
        kiClient,
        streamsClient: scopedClients.streamsClient,
        spaceId: await getSpaceId(request),
      });
    if (streamEnumerationTruncated) {
      throw new StatusError(
        'Code Intelligence reset is unavailable because the stream result reached its maximum size.',
        409
      );
    }
    const { streamNames, nextCursor } = getStreamBatch(authorizedStreamNames, params?.body?.cursor);
    if (streamNames.length === 0) {
      return { deleted: 0, streamsAffected: 0, failedStreams: [] };
    }

    // Reset only code-derived Features. Query KIs are retained because a code
    // extraction run can create no replacement for a previously useful query.
    const { hits: allFeatures } = await kiClient.getFeatures(streamNames, {
      includeExcluded: true,
      includeExpired: true,
      limit: CODE_KNOWLEDGE_INDICATORS_LIMIT,
    });
    if (allFeatures.length === CODE_KNOWLEDGE_INDICATORS_LIMIT) {
      throw new StatusError(
        'Code Intelligence reset is unavailable because the feature result reached its maximum size. Narrow the source data before retrying.',
        409
      );
    }

    const opsByStream = new Map<string, KIBulkOperation[]>();
    const addOp = (stream: string, op: KIBulkOperation) => {
      const ops = opsByStream.get(stream) ?? [];
      ops.push(op);
      opsByStream.set(stream, ops);
    };

    // Only delete purely code-derived Features. Merged features (`both`) also
    // carry log evidence, so deleting them would destroy the log side too.
    for (const feature of allFeatures) {
      if (isPurelyCodeSource(feature.evidence, feature.source)) {
        addOp(feature.stream_name, { delete: { type: KI_TYPE_FEATURE, id: feature.uuid } });
      }
    }

    let deleted = 0;
    const affected = new Set<string>();
    const failedStreams: string[] = [];
    for (const [streamName, ops] of opsByStream) {
      try {
        let appliedForStream = 0;
        for (
          let start = 0;
          start < ops.length;
          start += CODE_INTELLIGENCE_BULK_OPERATION_BATCH_SIZE
        ) {
          // Pause cancellation is best effort. Recheck each bounded write batch
          // so an operation admitted before pause cannot keep deleting afterwards.
          await assertNotPaused({ maintenanceService, request });
          const { applied } = await kiClient.bulk(
            streamName,
            ops.slice(start, start + CODE_INTELLIGENCE_BULK_OPERATION_BATCH_SIZE)
          );
          deleted += applied;
          appliedForStream += applied;
        }
        if (appliedForStream > 0) {
          affected.add(streamName);
        }
      } catch (error) {
        if (error instanceof SignificantEventsPausedError) {
          throw error;
        }
        failedStreams.push(streamName);
        routeLogger.warn(
          `code_intelligence: reset failed for stream "${streamName}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    routeLogger.info(
      `code_intelligence: reset removed ${deleted} code knowledge indicator(s) across ${affected.size} stream(s); ${failedStreams.length} stream(s) failed`
    );

    return {
      deleted,
      streamsAffected: affected.size,
      failedStreams,
      ...(nextCursor ? { nextCursor } : {}),
    };
  },
});

// ---------------------------------------------------------------------------
// Identify code intelligence for a single agent-resolved service (Stage 1 +
// Stage 2 + reconcile), code-first — no logs required.
//
// Called by the "Continuous Code KI Extraction" managed workflow: a single
// `ai.agent` step (the code-intelligence agent) enumerates deployable services
// by reasoning over the repo layout, and the workflow fans out one call per
// `{ repository, service }` here. Logging call sites are discovered
// deterministically server-side (grep over the indexed source) rather than by
// the agent, so file-finding is exact and LLM-free.
// ---------------------------------------------------------------------------

const trimToUndefined = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const nonEmptyStrings = (values: string[] | null | undefined): string[] | undefined => {
  const cleaned = (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
};

/**
 * Normalizes the agent-reported per-service metadata into a compact object,
 * dropping blank strings/empty arrays the workflow may send for fields the agent
 * could not determine.
 */
const buildServiceCodeMetadata = (
  service: {
    version?: string | null;
    environmentVariables?: string[] | null;
    configPaths?: string[] | null;
    loggingPattern?: string | null;
    tracing?: boolean | null;
    serviceRoot?: string | null;
  },
  {
    gitSha,
    iacSignals,
  }: {
    gitSha?: string | null;
    iacSignals?: Array<{ kind: string; path: string }> | null;
  }
): ServiceCodeMetadata | undefined => {
  const metadata: ServiceCodeMetadata = {};
  const version = trimToUndefined(service.version);
  if (version) metadata.version = version;
  const environmentVariables = nonEmptyStrings(service.environmentVariables);
  if (environmentVariables) metadata.environmentVariables = environmentVariables;
  const configPaths = nonEmptyStrings(service.configPaths);
  if (configPaths) metadata.configPaths = configPaths;
  const loggingPattern = trimToUndefined(service.loggingPattern);
  if (loggingPattern) metadata.loggingPattern = loggingPattern;
  if (typeof service.tracing === 'boolean') metadata.tracing = service.tracing;
  const serviceRoot = trimToUndefined(service.serviceRoot);
  if (serviceRoot) metadata.serviceRoot = serviceRoot;
  const resolvedGitSha = trimToUndefined(gitSha);
  if (resolvedGitSha) metadata.gitSha = resolvedGitSha;
  if (iacSignals?.length) metadata.iacSignals = iacSignals;
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const otelSignalCountsSchema = z.object({
  instrumentation_grpc: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  instrumentation_http: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  instrumentation_other: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  start_span: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  set_attribute: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  add_event: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  record_exception: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  set_status_error: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
  create_metric: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
});

const identifyOtelSignalsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_identify_otel_signals',
  options: {
    access: 'internal',
    summary: 'Extract typed OTel queries for one instrumented service',
    timeout: { idleSocket: 600_000 },
  },
  security: { authz: { requiredPrivileges: [STREAMS_API_PRIVILEGES.manage] } },
  params: z.object({
    body: z.object({
      repository: codeIntelligenceInput,
      gitSha: codeIntelligenceInput,
      serviceRoot: codeIntelligenceInput,
      name: codeIntelligenceInput,
      language: codeIntelligenceInput,
      hasOtel: z.boolean(),
      signalCounts: otelSignalCountsSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger, maintenanceService }) => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamDataEsClient, licensing, inferenceClient } = scopedClients;
    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });
    const { repository, gitSha, serviceRoot, name, language, signalCounts } = params.body;
    const routeLogger = logger.get('code_intelligence', 'identify_otel_signals', name);
    // Sourcerer is always in the origin project. Stream sampling may route to a
    // connected project, so it must use the space-routed data client.
    const sourceEsClient = scopedClusterClient.asCurrentUser;
    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const streams = await listStreamSamplingSources(scopedClients.streamsClient);
    const authorizedStreamNames = new Set(
      await listAccessibleStreamNames(scopedClients.streamsClient)
    );

    const runTemplateFallback = async () => {
      const candidates = await discoverLoggingSites({
        esClient: sourceEsClient,
        repository,
        gitSha,
        serviceRoot,
        language,
        logger: routeLogger,
      });
      const connectorId = await resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
        featureName: 'logging-site classification',
        request,
      });
      const loggingChunks = await classifyLoggingSites({
        inferenceClient,
        connectorId,
        candidates,
        logger: routeLogger,
      });
      await assertNotPaused({ maintenanceService, request });
      return identifyCodeQueries({
        serviceName: name,
        repository,
        gitSha,
        streams,
        kiClient,
        loggingChunks,
        esClient: streamDataEsClient,
        logger: routeLogger,
        hasOtel: true,
        otelGateBypassed: true,
        authorizedStreamNames,
      });
    };

    // Both fallback causes (failed extraction, no typed stream coverage) must
    // leave the service with real coverage. An idempotent rerun that regenerates
    // nothing but still owns fallback streams counts as covered; producing no
    // coverage at all fails the iteration so the workflow retries visibly.
    const runTemplateFallbackOrThrow = async (reason: string) => {
      await assertNotPaused({ maintenanceService, request });
      const fallback = await runTemplateFallback();
      if ((fallback.generatedCount ?? 0) === 0 && (fallback.streams?.length ?? 0) === 0) {
        throw new Error(`OTel service "${name}" ${reason} and produced no query coverage.`);
      }
      return { status: 'gate_bypassed' as const, queriesGenerated: fallback.generatedCount ?? 0 };
    };

    const extraction = await extractOtelSignalsResult({
      esClient: sourceEsClient,
      repository,
      gitSha,
      serviceRoot,
      logger: routeLogger,
    });
    if (extraction.failed) {
      routeLogger.warn(
        `OTel signal extraction failed for service "${name}"; using template query fallback`
      );
      return runTemplateFallbackOrThrow('failed source extraction');
    }
    const resolved = await resolveSignalStreams({
      streams,
      esClient: streamDataEsClient,
      logger: routeLogger,
    });
    const generated = generateOtelQueries({
      serviceName: name,
      repository,
      gitSha,
      signals: extraction.signals,
      signalCounts,
      ...resolved,
    });

    // Template queries are valid only when no typed signal tier can target a
    // usable stream. Any later typed-path failure must not create a mixed
    // typed/message-string result for this OTel service.
    if (generated.gateBypassed) {
      routeLogger.warn(`otel gate bypassed for service "${name}"; using template query fallback`);
      return runTemplateFallbackOrThrow('had no typed stream coverage');
    }

    let classified = generated.queries;
    try {
      const connectorId = await resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
        featureName: 'OTel signal classification',
        request,
      });
      classified = await classifyOtelSignals({
        inferenceClient,
        connectorId,
        candidates: generated.queries,
        logger: routeLogger,
      });
    } catch (error) {
      routeLogger.warn(
        `otel signal classification failed for service "${name}"; keeping deterministic typed queries: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    let queriesGenerated = 0;
    const byStream = new Map<string, typeof classified>();
    for (const candidate of classified) {
      const entries = byStream.get(candidate.stream) ?? [];
      entries.push(candidate);
      byStream.set(candidate.stream, entries);
    }
    for (const [streamName, candidates] of byStream) {
      const { [streamName]: existing } = await kiClient.getStreamToQueryLinksMap([streamName]);
      const existingEsql = new Set(
        existing.map(({ query }) => normalizeEsqlSafe(query.esql.query))
      );
      const fresh = candidates.filter(
        ({ query }) => !existingEsql.has(normalizeEsqlSafe(query.esql.query))
      );
      if (fresh.length === 0) continue;
      await assertNotPaused({ maintenanceService, request });
      await kiClient.bulk(
        streamName,
        fresh.map(({ query }) => ({ index: { query: { ...query, rule_backed: false } } }))
      );
      queriesGenerated += fresh.length;
      await assertNotPaused({ maintenanceService, request });
      // Typed OTel KIs have deterministic IDs and are exact-ES|QL deduplicated
      // above. They must not enter the destructive semantic reconciler.
    }
    // A prior no-stream run can have persisted message templates. Remove them
    // only after all typed writes succeed, so a transient typed failure retains
    // the fallback coverage for retry.
    if (classified.length > 0) {
      await removeStaleTemplateQueries({
        streams,
        kiClient,
        serviceName: name,
        repository,
        authorizedStreamNames,
      });
    }
    return { status: 'generated' as const, queriesGenerated };
  },
});

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
      repository: codeIntelligenceInput,
      gitSha: codeIntelligenceInput,
      repositoryLanguages: z
        .array(
          z.object({
            language: codeIntelligenceInput,
            count: z.number().int().min(0).max(CODE_INTELLIGENCE_MAX_COUNT),
          })
        )
        .max(CODE_INTELLIGENCE_MAX_ARRAY_SIZE)
        .nullish(),
      iacSignals: z
        .array(
          z.object({
            kind: z.enum([
              'kubernetes',
              'helm',
              'compose',
              'terraform',
              'pulumi',
              'cloudformation',
            ]),
            path: codeIntelligenceInput,
          })
        )
        .max(CODE_INTELLIGENCE_MAX_ARRAY_SIZE)
        .nullish(),
      hasOtel: z.boolean().optional(),
      service: z.object({
        name: codeIntelligenceInput,
        serviceRoot: codeIntelligenceInput,
        language: codeIntelligenceInput.optional(),
        // Additional code-derived service metadata gathered by the agent. All
        // optional: the agent omits what it cannot determine, and the workflow
        // may send empty strings/nulls for absent fields (normalized below).
        version: codeIntelligenceInput.nullish(),
        environmentVariables: z
          .array(codeIntelligenceInput)
          .max(CODE_INTELLIGENCE_MAX_ARRAY_SIZE)
          .nullish(),
        configPaths: z.array(codeIntelligenceInput).max(CODE_INTELLIGENCE_MAX_ARRAY_SIZE).nullish(),
        loggingPattern: codeIntelligenceTextInput.nullish(),
        tracing: z.boolean().nullish(),
        evidence: z
          .array(
            z.object({
              path: codeIntelligenceInput,
              line: z.number().int().min(1).max(CODE_INTELLIGENCE_MAX_COUNT).optional(),
              snippet: codeIntelligenceTextInput.optional(),
            })
          )
          .max(CODE_INTELLIGENCE_MAX_ARRAY_SIZE)
          .nullish(),
      }),
      runId: codeIntelligenceInput.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
    maintenanceService,
  }): Promise<{
    status: 'updated' | 'noop' | 'no_repo';
    streamName: string;
    featuresPersisted: number;
    queriesGenerated: number;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, streamDataEsClient, licensing, inferenceClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const {
      repository,
      gitSha,
      repositoryLanguages,
      iacSignals,
      service,
      runId = uuidv4(),
    } = params.body;
    const routeLogger = logger.get('code_intelligence', 'identify_service', service.name);
    const metadata = buildServiceCodeMetadata(service, { gitSha, iacSignals });
    const spaceId = await getSpaceId(request);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const esClient = scopedClusterClient.asCurrentUser;

    const hasOtel = params.body.hasOtel ?? false;

    // Stage 3 (non-OTel only): deterministically grep candidate logging call
    // sites and classify them. OTel services use typed queries, so their
    // message-string queries are gated off in identifyCodeQueries; running the
    // grep + classification for them only produces a result that is discarded.
    let loggingChunks: Awaited<ReturnType<typeof classifyLoggingSites>> = [];
    if (!hasOtel) {
      const candidates = await discoverLoggingSites({
        esClient,
        repository,
        gitSha,
        serviceRoot: service.serviceRoot,
        language: service.language,
        logger: routeLogger,
      });
      const classifierConnectorId = await resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
        featureName: 'logging-site classification',
        request,
      });
      loggingChunks = await classifyLoggingSites({
        inferenceClient,
        connectorId: classifierConnectorId,
        candidates,
        logger: routeLogger,
      });
    }

    // Stage 1: derive code Feature KIs (repo type, language, predicted service name).
    await assertNotPaused({ maintenanceService, request });
    const featureResult = await identifyCodeFeaturesForService({
      repository,
      gitSha,
      languageHistogram: repositoryLanguages ?? undefined,
      iacSignals: iacSignals ?? undefined,
      serviceName: service.name,
      spaceId,
      language: service.language,
      evidence: service.evidence ?? undefined,
      kiClient,
      logger: routeLogger,
      runId,
      beforeWrite: () => assertNotPaused({ maintenanceService, request }),
    });

    const streams = await listStreamSamplingSources(scopedClients.streamsClient);
    const authorizedStreamNames = new Set(
      await listAccessibleStreamNames(scopedClients.streamsClient)
    );

    // Stage 2: generate predictive Query KIs from the service's logger call
    // sites, written to the real stream(s) that ingest the service.
    await assertNotPaused({ maintenanceService, request });
    const queryResult = await identifyCodeQueries({
      serviceName: featureResult.streamName,
      repository,
      gitSha,
      streams,
      metadata,
      kiClient,
      loggingChunks,
      esClient: streamDataEsClient,
      logger: routeLogger,
      hasOtel,
      authorizedStreamNames,
    });

    // Reconcile code- and log-derived Query KIs on each ingesting stream that
    // now carries code queries (semantic dedup merges the two sources).
    for (const streamName of queryResult.streams ?? []) {
      await assertNotPaused({ maintenanceService, request });
      await reconcileCodeAndLogQueries({ streamName, kiClient, logger: routeLogger });
    }

    // Represent the service as an entity/service KI on the ingesting stream(s),
    // merging with any matching log-derived entity. Runs every time (even on a
    // code no-op) so it tracks log entities that appear after the code was
    // analyzed.
    await assertNotPaused({ maintenanceService, request });
    try {
      await linkServiceEntities({
        serviceName: featureResult.streamName,
        repository,
        fingerprint: featureResult.fingerprint,
        citations: service.evidence ?? undefined,
        metadata,
        streams,
        esClient: streamDataEsClient,
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
// Deterministic service discovery (Stage 4).
//
// Replaces the `ai.agent` SERVICE_DISCOVERY pass: enumerates indexed repos from
// the Sourcerer refs index, greps deploy-marker + manifest file paths to derive
// candidate service roots (+ marker-implied language + IaC signals) with NO LLM,
// then runs ONE batched classify call to judge which roots are real deployable
// services and collapse environment/region duplicates into logical services.
// Returns the `services[]` shape the extraction workflow's `_identify_service`
// fan-out already consumes, so the workflow just swaps its agent step for a
// request to this route.
// ---------------------------------------------------------------------------

const discoverServicesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_discover_services',
  options: {
    access: 'internal',
    summary: 'Deterministically discover deployable services across indexed repositories',
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
    maintenanceService,
  }): Promise<{ services: DiscoveredService[] }> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing, inferenceClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'discover_services');
    const esClient = scopedClusterClient.asCurrentUser;

    // Enumerate indexed repos, then grep candidate roots + manifests per repo.
    const repos = await listIndexedRepos({ esClient, logger: routeLogger });
    if (repos.length === 0) {
      return { services: [] };
    }

    const candidates: ServiceCandidateRoot[] = [];
    const manifestPathsByRepo = new Map<string, string[]>();
    const manifestLinesByRepo = new Map<string, string[]>();
    const serviceNameLinesByRepo = new Map<string, string[]>();
    const iacSignalsByRepo = new Map<string, IacSignal[]>();
    const readmeLinesByRepo = new Map<string, string[]>();
    const repositoryLanguagesByRepo = new Map<string, LanguageCount[]>();
    const otelDetectionByRoot = new Map<string, OtelDetection>();
    for (const repo of repos) {
      const {
        candidates: roots,
        manifestPaths,
        manifestLines,
        serviceNameLines,
        iacSignals,
        readmeLines,
      } = await discoverCandidateRoots({
        esClient,
        repo,
        logger: routeLogger,
      });
      candidates.push(...roots);
      // Batched: 1 repo-scoped grep per pattern, bucketed to every root, instead
      // of O(roots × patterns) searches inside this single request handler.
      const detectionByRoot = await detectOtelInstrumentationForRoots({
        esClient,
        repository: repo.repository,
        gitSha: repo.gitSha,
        serviceRoots: roots.map((root) => root.serviceRoot),
        logger: routeLogger,
      });
      for (const [serviceRoot, detection] of detectionByRoot) {
        otelDetectionByRoot.set(`${repo.repository}::${serviceRoot}`, detection);
      }
      manifestPathsByRepo.set(repo.repository, manifestPaths);
      manifestLinesByRepo.set(repo.repository, manifestLines);
      serviceNameLinesByRepo.set(repo.repository, serviceNameLines);
      iacSignalsByRepo.set(repo.repository, iacSignals);
      readmeLinesByRepo.set(repo.repository, readmeLines);
      repositoryLanguagesByRepo.set(
        repo.repository,
        await buildLanguageHistogram({ esClient, repo, logger: routeLogger })
      );
    }

    const hasManifestLines = [...manifestLinesByRepo.values()].some(
      (manifestLines) => manifestLines.length > 0
    );
    if (candidates.length === 0 && !hasManifestLines) {
      return { services: [] };
    }

    const connectorId = await resolveConnectorForFeature({
      searchInferenceEndpoints: server.searchInferenceEndpoints,
      featureId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
      featureName: 'service discovery classification',
      request,
    });

    await assertNotPaused({ maintenanceService, request });
    const services = await classifyServices({
      inferenceClient,
      connectorId,
      candidates,
      repos,
      manifestPathsByRepo,
      manifestLinesByRepo,
      serviceNameLinesByRepo,
      iacSignalsByRepo,
      readmeLinesByRepo,
      repositoryLanguagesByRepo,
      otelDetectionByRoot,
      logger: routeLogger,
    });

    return { services };
  },
});

// ---------------------------------------------------------------------------
// Run code intelligence across all indexed repositories on demand.
//
// Triggers the managed "Continuous Code KI Extraction" workflow for the current
// space (singleton per space — reuses a running execution). The workflow's
// discovery step enumerates services and fans out to `_identify_service`, so
// this returns immediately with the execution id rather than blocking on the
// full run. Backs the discovery Code Intelligence tab "Identify features &
// queries" button.
// ---------------------------------------------------------------------------

const runCodeIntelligenceRoute = createServerRoute({
  endpoint: 'POST /internal/streams/code_intelligence/_run',
  options: {
    access: 'internal',
    summary: 'Trigger code intelligence extraction across indexed repositories',
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
    logger,
    maintenanceService,
  }): Promise<{ executionId: string; isNew: boolean }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const codeExtractionClient = workflowClients.codeExtractionClient;
    const readiness = await getCodeIntelligenceReadiness({
      request,
      server,
      codeExtractionClient,
    });
    if (!readiness.available) {
      throw new FeatureNotEnabledError(readiness.message);
    }
    if (!codeExtractionClient) {
      throw new FeatureNotEnabledError('Code Intelligence extraction workflow is not available.');
    }

    const spaceId = await getSpaceId(request);
    return codeExtractionClient.run({ request, spaceId });
  },
});

// ---------------------------------------------------------------------------
// Reconcile KIs across streams the request can access on demand.
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
    summary: 'Reconcile duplicate Query KIs across accessible streams and refresh stream linkage',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({ cursor: codeIntelligenceInput.optional() }).optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    maintenanceService,
  }): Promise<{
    streamsReconciled: number;
    clustersMerged: number;
    queriesTombstoned: number;
    failedStreams: string[];
    nextCursor?: string;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const routeLogger = logger.get('code_intelligence', 'reconcile');
    const { streamNames, nextCursor } = getStreamBatch(
      await listAccessibleStreamNames(scopedClients.streamsClient),
      params?.body?.cursor
    );
    if (streamNames.length === 0) {
      return {
        streamsReconciled: 0,
        clustersMerged: 0,
        queriesTombstoned: 0,
        failedStreams: [],
      };
    }

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    let streamsReconciled = 0;
    let clustersMerged = 0;
    let queriesTombstoned = 0;
    const failedStreams: string[] = [];

    for (const streamName of streamNames) {
      try {
        await assertNotPaused({ maintenanceService, request });
        const links = await kiClient.getQueryLinks([streamName], {
          ruleUnbacked: 'include',
          includeExpired: true,
          limit: CODE_KNOWLEDGE_INDICATORS_LIMIT,
        });
        if (links.length === CODE_KNOWLEDGE_INDICATORS_LIMIT) {
          throw new StatusError(
            `Reconciliation is unavailable for stream "${streamName}" because its query result reached the maximum size.`,
            409
          );
        }
        await assertNotPaused({ maintenanceService, request });
        const result = await reconcileCodeAndLogQueries({
          streamName,
          kiClient,
          logger: routeLogger,
        });
        streamsReconciled += 1;
        clustersMerged += result.clustersMerged;
        queriesTombstoned += result.queriesTombstoned;
      } catch (error) {
        if (error instanceof SignificantEventsPausedError) {
          throw error;
        }
        failedStreams.push(streamName);
        routeLogger.warn(
          `code_intelligence: reconcile failed for stream "${streamName}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      streamsReconciled,
      clustersMerged,
      queriesTombstoned,
      failedStreams,
      ...(nextCursor ? { nextCursor } : {}),
    };
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
  params: z.object({
    query: z.object({ executionId: codeIntelligenceInput.optional() }).optional(),
  }),
  handler: async ({
    params,
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

    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const spaceId = await getSpaceId(request);
    return codeExtractionClient.getStatus({
      spaceId,
      executionId: params?.query?.executionId,
    });
  },
});

export const internalKICodeFeaturesRoutes = {
  ...reconcileCodeQueriesRoute,
  ...codeIntelligenceAvailabilityRoute,
  ...listCodeKnowledgeIndicatorsRoute,
  ...serviceDistributionRoute,
  ...identifyServiceRoute,
  ...identifyOtelSignalsRoute,
  ...discoverServicesRoute,
  ...runCodeIntelligenceRoute,
  ...codeIntelligenceRunStatusRoute,
  ...reconcileKnowledgeIndicatorsRoute,
  ...resetCodeFeaturesRoute,
};
