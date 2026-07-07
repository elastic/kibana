/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import {
  MAX_STREAM_NAME_LENGTH,
  Streams,
  findInheritedLifecycle,
  isIlmLifecycle,
  TIER_TO_PHASE,
  type IlmPolicyWithUsage,
  type PhaseName,
} from '@kbn/streams-schema';
import { processAsyncInChunks } from '../../../../utils/process_async_in_chunks';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { ilmPhases } from '../../../../lib/streams/lifecycle/ilm_phases';
import { getEffectiveLifecycle } from '../../../../lib/streams/lifecycle/get_effective_lifecycle';
import {
  getTemplateLifecycle,
  simulateClassicStreamTemplate,
} from '../../../../lib/streams/data_streams/manage_data_streams';
import {
  buildPolicyUsage,
  normalizeIlmPhases,
  type IlmPoliciesResponse,
} from '../../../../lib/streams/lifecycle/ilm_policies';
import {
  getExistingPolicy,
  assertValidPolicyPhases,
  assertPolicyNameIsValid,
} from '../../../../lib/streams/lifecycle/ilm_policy_validation';
import { StatusError } from '../../../../lib/streams/errors/status_error';

type PhaseNameWithoutDelete = Exclude<PhaseName, 'delete'>;

const MAX_BACKING_INDICES = 1000;

export interface DslPhaseStat {
  size_in_bytes: number;
  docs_count: number;
}

// Resolves the phase of a backing index from its `_tier_preference` setting (the first preferred
// tier that maps to a known phase). Used for indices that the document-level `_tier` aggregation
// cannot see — e.g. an empty backing index has no documents and therefore no `_tier` bucket, yet it
// still holds store overhead that should be attributed to its phase (matching ILM, which maps every
// managed index regardless of doc count).
const phaseFromTierPreference = (
  tierPreference: string | undefined
): PhaseNameWithoutDelete | undefined => {
  if (!tierPreference) {
    return undefined;
  }
  for (const tier of tierPreference.split(',')) {
    const phase = TIER_TO_PHASE[tier.trim()];
    if (phase) {
      return phase;
    }
  }
  return undefined;
};

// Per-phase storage size and document count for a DSL stream. Each backing index is attributed to a
// phase, preferring its runtime `_tier` allocation (authoritative, and the only way to place frozen
// searchable-snapshot indices) and falling back to the `_tier_preference` setting so that empty
// indices — which contribute no documents to the `_tier` aggregation — are still counted.
const getDslPhaseStats = async (
  scopedClusterClient: IScopedClusterClient,
  name: string,
  dataStreamName: string
): Promise<Partial<Record<PhaseNameWithoutDelete, DslPhaseStat>>> => {
  // `ignore_unavailable: true` on the search prevents index_not_found_exception for streams with
  // no backing indices yet (e.g. freshly created streams with no data), returning empty results.
  const [searchResponse, statsResponse, settingsResponse] = await Promise.all([
    scopedClusterClient.asCurrentUser.search({
      index: name,
      size: 0,
      ignore_unavailable: true,
      track_total_hits: false,
      aggs: {
        tiers: {
          filters: {
            filters: Object.fromEntries(
              Object.keys(TIER_TO_PHASE).map((tier) => [tier, { term: { _tier: tier } }])
            ),
          },
          aggs: {
            indices: {
              terms: { field: '_index', size: MAX_BACKING_INDICES },
            },
          },
        },
      },
    }),
    scopedClusterClient.asCurrentUser.indices.stats({
      index: dataStreamName,
      metric: ['store', 'docs'],
    }),
    scopedClusterClient.asCurrentUser.indices.getSettings({
      index: dataStreamName,
      filter_path: ['*.settings.index.routing.allocation.include._tier_preference'],
    }),
  ]);
  const { aggregations } = searchResponse;
  const indicesStats = statsResponse.indices ?? {};

  const tierBuckets =
    (
      aggregations?.tiers as
        | { buckets: Record<string, { indices: { buckets: Array<{ key: string }> } }> }
        | undefined
    )?.buckets ?? {};

  // Authoritative runtime allocation: map each index that actually holds documents to its `_tier`.
  const indexToTierPhase: Record<string, PhaseNameWithoutDelete> = {};
  for (const [tier, tierBucket] of Object.entries(tierBuckets)) {
    const phase = TIER_TO_PHASE[tier];
    if (!phase) {
      continue;
    }
    for (const indexBucket of tierBucket.indices?.buckets ?? []) {
      indexToTierPhase[indexBucket.key] = phase;
    }
  }

  const phaseStats: Partial<Record<PhaseNameWithoutDelete, DslPhaseStat>> = {};
  // Iterate over every backing index from the stats response (includes empty indices). Prefer its
  // runtime `_tier`, else fall back to the `_tier_preference` setting; skip indices we can't place.
  for (const [indexName, stats] of Object.entries(indicesStats)) {
    const tierPreference =
      settingsResponse[indexName]?.settings?.index?.routing?.allocation?.include?._tier_preference;
    const phase = indexToTierPhase[indexName] ?? phaseFromTierPreference(tierPreference);
    if (!phase) {
      continue;
    }
    const entry = (phaseStats[phase] ??= { size_in_bytes: 0, docs_count: 0 });
    // Size uses `total` (primaries + replicas) to match the metric ILM phase stats report (see
    // `ilmPhases`) and the dataset-quality summary card. Docs use `primaries` to avoid counting the
    // same document once per replica.
    entry.size_in_bytes += stats?.total?.store?.total_data_set_size_in_bytes ?? 0;
    entry.docs_count += stats?.primaries?.docs?.count ?? 0;
  }

  return phaseStats;
};

const getDataStreamByBackingIndices = async (
  scopedClusterClient: IScopedClusterClient,
  policiesResponse: IlmPoliciesResponse
): Promise<Record<string, string>> => {
  const inUseIndices = Array.from(
    new Set(
      Object.values(policiesResponse).flatMap((policyEntry) => policyEntry.in_use_by?.indices ?? [])
    )
  );

  if (inUseIndices.length === 0) {
    return {};
  }

  const indexResponse = await processAsyncInChunks<IndicesGetResponse>(
    inUseIndices,
    async (indicesChunk) =>
      scopedClusterClient.asCurrentUser.indices.get({
        index: indicesChunk,
        allow_no_indices: true,
        ignore_unavailable: true,
        filter_path: ['*.data_stream'],
      })
  );

  return Object.fromEntries(
    Object.entries(indexResponse).flatMap(([indexName, indexData]) => {
      const { data_stream: dataStream } = indexData;
      return dataStream ? [[indexName, dataStream]] : [];
    })
  );
};

const lifecycleStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_stats',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!Streams.ingest.all.Definition.is(definition)) {
      throw new StatusError('Lifecycle stats are only available for ingest streams', 400);
    }

    const dataStream = await streamsClient.getDataStream(name);
    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });
    if (!isIlmLifecycle(lifecycle)) {
      throw new StatusError('Lifecycle stats are only available for ILM policy', 400);
    }

    const policyName = lifecycle.ilm.policy;
    let policyDetails: Awaited<
      ReturnType<typeof scopedClusterClient.asCurrentUser.ilm.getLifecycle>
    >;
    try {
      policyDetails = await scopedClusterClient.asCurrentUser.ilm.getLifecycle({
        name: policyName,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return { phases: undefined, policy_missing: true };
      }
      throw error;
    }

    const { policy } = policyDetails[policyName];

    const [{ indices: indicesIlmDetails }, { indices: indicesStats = {} }] = await Promise.all([
      scopedClusterClient.asCurrentUser.ilm.explainLifecycle({ index: name }),
      scopedClusterClient.asCurrentUser.indices.stats({ index: dataStream.name }),
    ]);

    return {
      phases: ilmPhases({ policy, indicesIlmDetails, indicesStats }),
      policy_missing: false,
    };
  },
});

const lifecycleDslPhaseStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_dsl_phase_stats',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<{ phases: Partial<Record<PhaseNameWithoutDelete, DslPhaseStat>> | undefined }> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!Streams.ingest.all.Definition.is(definition)) {
      throw new StatusError('Lifecycle phase stats are only available for ingest streams', 400);
    }

    const dataStream = await streamsClient.getDataStream(name);
    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });
    if (isIlmLifecycle(lifecycle)) {
      throw new StatusError(
        'DSL phase stats are only available for data stream lifecycle (DSL) streams',
        400
      );
    }

    // Degrade gracefully on any unexpected ES error rather than returning a 500. We return
    // `phases: undefined` (not `{}`) so the client can distinguish "stats unavailable" from
    // "resolved, but no data in any phase". An empty object would be treated as authoritative and
    // render hot/frozen as 0 B / 0 docs (real-looking lifecycle data); `undefined` instead lets the
    // client treat the per-phase split as unavailable.
    try {
      const phases = await getDslPhaseStats(scopedClusterClient, name, dataStream.name);
      return { phases };
    } catch (error) {
      logger.warn('Failed to fetch DSL phase stats', { error: error as Error });
      return { phases: undefined };
    }
  },
});

const lifecycleIlmExplainRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_explain',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    // verifies read privileges
    await streamsClient.getStream(name);

    return scopedClusterClient.asCurrentUser.ilm.explainLifecycle({
      index: name,
    });
  },
});

const lifecycleInheritedRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_inherited',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  }),
  handler: async ({ params, request, getScopedClients, logger }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!Streams.ingest.all.Definition.is(definition)) {
      throw new StatusError('Inherited lifecycle is only available for ingest streams', 400);
    }

    if (Streams.WiredStream.Definition.is(definition)) {
      const ancestors = await streamsClient.getAncestors(name);
      const inheritingDefinition: Streams.WiredStream.Definition = {
        ...definition,
        ingest: { ...definition.ingest, lifecycle: { inherit: {} } },
      };

      return { lifecycle: findInheritedLifecycle(inheritingDefinition, ancestors) };
    }

    const template = await simulateClassicStreamTemplate({
      esClient: scopedClusterClient.asCurrentUser,
      name,
      logger,
    });

    if (!template || !template.settings) {
      throw new StatusError(
        `Cannot determine template lifecycle for ${name} — the data stream may be replicated and managed by a remote cluster`,
        400
      );
    }

    return { lifecycle: getTemplateLifecycle(template) };
  },
});

const lifecycleIlmPoliciesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/lifecycle/_policies',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<IlmPolicyWithUsage[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const policiesResponse =
      (await scopedClusterClient.asCurrentUser.ilm.getLifecycle()) as IlmPoliciesResponse;
    const dataStreamByBackingIndices = await getDataStreamByBackingIndices(
      scopedClusterClient,
      policiesResponse
    );
    return Object.entries(policiesResponse).map(([policyName, policyEntry]) => {
      const { in_use_by } = buildPolicyUsage(policyEntry, dataStreamByBackingIndices);
      return {
        name: policyName,
        phases: normalizeIlmPhases(policyEntry.policy?.phases),
        meta: policyEntry.policy?._meta,
        deprecated: policyEntry.policy?.deprecated,
        in_use_by,
      };
    });
  },
});

const ilmPhaseSchema = z.looseObject({
  min_age: z.string().optional(),
  actions: z.record(z.string(), z.any()).optional(),
});

const lifecycleIlmPoliciesUpdateRoute = createServerRoute({
  endpoint: 'POST /internal/streams/lifecycle/_policy',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      name: z.string(),
      phases: z.object({
        hot: ilmPhaseSchema.optional(),
        warm: ilmPhaseSchema.optional(),
        cold: ilmPhaseSchema.optional(),
        frozen: ilmPhaseSchema.optional(),
        delete: ilmPhaseSchema.optional(),
      }),
      meta: z.record(z.string(), z.any()).optional(),
      deprecated: z.boolean().optional(),
      source_policy_name: z.string().optional(),
    }),
    query: z.object({
      allow_overwrite: BooleanFromString.optional().default(false),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const { name, meta, source_policy_name: sourcePolicyName, ...policy } = params.body;
    const { allow_overwrite: allowOverwrite = false } = params.query;
    const existingPolicy = await getExistingPolicy(scopedClusterClient, name);
    const sourcePolicy = sourcePolicyName
      ? await getExistingPolicy(scopedClusterClient, sourcePolicyName)
      : undefined;

    assertPolicyNameIsValid(existingPolicy, allowOverwrite);

    assertValidPolicyPhases({
      existingPolicy,
      incomingPhases: policy.phases,
      sourcePolicy,
    });

    const basePolicy = existingPolicy?.policy ?? {};
    const mergedPolicy = {
      ...basePolicy,
      ...policy,
      phases: policy.phases ?? basePolicy.phases,
      _meta: meta ?? basePolicy._meta,
      deprecated: policy.deprecated ?? basePolicy.deprecated,
    };
    await scopedClusterClient.asCurrentUser.ilm.putLifecycle({ name, policy: mergedPolicy });
    return { acknowledged: true };
  },
});

const lifecycleSnapshotRepositoriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/lifecycle/_snapshot_repositories',
  options: {
    access: 'internal',
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
  }): Promise<{
    repositories: Array<{ name: string; type: string }>;
    default_repository?: string;
  }> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const [repositoriesByName, clusterSettings] = await Promise.all([
      scopedClusterClient.asCurrentUser.snapshot.getRepository({ name: '*' }),
      scopedClusterClient.asCurrentUser.cluster.getSettings({
        filter_path: 'persistent.repositories.default_repository',
      }),
    ]);

    const repositories = Object.entries(repositoriesByName).map(([name, { type }]) => ({
      name,
      type: type ?? '',
    }));

    // The frozen data stream lifecycle phase relies on the cluster's default snapshot repository
    // (`persistent.repositories.default_repository`) for its searchable snapshots.
    const rawDefaultRepository = (
      clusterSettings.persistent?.repositories as { default_repository?: unknown } | undefined
    )?.default_repository;
    const defaultRepository =
      typeof rawDefaultRepository === 'string' && rawDefaultRepository.trim().length > 0
        ? rawDefaultRepository
        : undefined;

    return { repositories, default_repository: defaultRepository };
  },
});

export const internalLifecycleRoutes = {
  ...lifecycleStatsRoute,
  ...lifecycleDslPhaseStatsRoute,
  ...lifecycleIlmExplainRoute,
  ...lifecycleInheritedRoute,
  ...lifecycleIlmPoliciesRoute,
  ...lifecycleIlmPoliciesUpdateRoute,
  ...lifecycleSnapshotRepositoriesRoute,
};
