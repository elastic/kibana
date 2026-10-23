/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import { ENTITY_RELATIONSHIP_COLLECT_LEAVES } from '../../../common/domain/definitions/common_fields';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import type {
  EntityMetadataEventPayload,
  EntitySourceStateEventPayload,
} from '../../telemetry/events';
import { runPart, toCollectionEntry, type CollectionResult } from './collection';

const TYPE_FIELD = 'entity.EngineMetadata.Type';
const UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';
const SOURCE_FIELD = 'entity.source';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const LAST_SEEN_FIELD = 'entity.lifecycle.last_seen';
const WATCHLISTS_FIELD = 'entity.attributes.watchlists';
const RISK_SCORE_FIELD = 'entity.risk.calculated_score_norm';

/** Prefix of the id of the only managed watchlist (privileged users). Custom ids never start with it. */
const MANAGED_WATCHLIST_ID_PREFIX = 'privileged-user-monitoring-watchlist-id';
const SOURCE_TERMS_SIZE = 30;
const SMALL_TERMS_SIZE = 30;
const LOGS_EXTRACTION_CREATOR = 'logs_extraction';
const BOOLEAN_ATTRIBUTES = ['asset', 'managed', 'mfa_enabled'] as const;
const SHARED_VALUE_FIELDS = ['user.email', 'user.name', 'user.id'] as const;
const MAX_SHARED_VALUE_PAIRS = 10;
const MAX_SOURCES_PER_VALUE_FOR_PAIRS = 10;
const SHARED_VALUE_ROW_LIMIT = 10000;
const GROUP_SIZE_ROW_LIMIT = 1000;

const TYPES_WITH_IDENTITY_PROVIDER: readonly EntityType[] = ['user'];
const TYPES_WITH_PRIMARY_IDENTIFIER: readonly EntityType[] = ['user', 'host'];
const TYPES_WITH_CASE_DUPLICATES: readonly EntityType[] = ['user', 'host'];

interface TermsBucket {
  key?: string | number;
  key_as_string?: string;
  doc_count?: number;
}

interface DocCountAgg {
  doc_count?: number;
}

interface SourceBucket extends TermsBucket {
  resolved?: DocCountAgg;
  withRiskScore?: DocCountAgg;
  watchlistManaged?: DocCountAgg;
  watchlistCustom?: DocCountAgg;
}

interface MetadataAggs {
  sources?: { buckets?: SourceBucket[] };
  withoutSource?: DocCountAgg;
  withMultipleSources?: DocCountAgg;
  byCreator?: { buckets?: TermsBucket[] };
  byIdentityProvider?: { buckets?: TermsBucket[] };
  activity?: { buckets?: Record<string, DocCountAgg> };
  criticality?: { buckets?: TermsBucket[] };
  onAnyWatchlist?: DocCountAgg;
  relationships?: { buckets?: Record<string, DocCountAgg> };
  [attribute: `attr_${string}`]: { buckets?: TermsBucket[] } | undefined;
}

type SourceState = Omit<EntitySourceStateEventPayload, 'namespace' | 'entityType'>;
type MetadataPayload = Omit<EntityMetadataEventPayload, 'namespace' | 'entityType' | 'collection'>;

interface CheapPassResult {
  metadata: MetadataPayload;
  sources: Map<string, SourceState>;
}

const countOf = (agg: DocCountAgg | undefined): number => agg?.doc_count ?? 0;

const bucketCounts = (buckets: TermsBucket[] | undefined): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const bucket of buckets ?? []) {
    if (bucket.key !== undefined) {
      const key = String(bucket.key_as_string ?? bucket.key);
      counts.set(key, (counts.get(key) ?? 0) + (bucket.doc_count ?? 0));
    }
  }
  return counts;
};

const firstChunk = (source: string): string => source.split('.')[0];

/** A source is an integration when its first dotted chunk is a Fleet-managed package name. */
export const toSourceKind = (
  source: string,
  fleetPackages: ReadonlySet<string>
): 'integration' | 'custom' => (fleetPackages.has(firstChunk(source)) ? 'integration' : 'custom');

/** Names of the packages installed by Fleet, read from their index templates. */
export const getFleetPackageNames = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<Set<string>> => {
  const packages = new Set<string>();
  try {
    const response = await esClient.indices.getIndexTemplate({
      name: '*',
      filter_path: [
        'index_templates.index_template._meta.package.name',
        'index_templates.index_template._meta.managed_by',
      ],
    });
    for (const { index_template: template } of response.index_templates ?? []) {
      const meta = template?._meta as { managed_by?: string; package?: { name?: string } };
      if (meta?.managed_by === 'fleet' && meta.package?.name) {
        packages.add(meta.package.name);
      }
    }
  } catch (e) {
    logger.warn(`Failed to read Fleet package names for source kind telemetry: ${e}`);
  }
  return packages;
};

const buildCheapPassAggs = (entityType: EntityType) => ({
  sources: {
    terms: { field: SOURCE_FIELD, size: SOURCE_TERMS_SIZE },
    aggs: {
      resolved: { filter: { exists: { field: RESOLVED_TO_FIELD } } },
      withRiskScore: { filter: { exists: { field: RISK_SCORE_FIELD } } },
      watchlistManaged: {
        filter: { prefix: { [WATCHLISTS_FIELD]: MANAGED_WATCHLIST_ID_PREFIX } },
      },
      // An entity can be on managed and custom watchlists at once, so test each value.
      watchlistCustom: {
        filter: {
          script: {
            script: {
              source: `for (def id : doc['${WATCHLISTS_FIELD}']) { if (!id.startsWith(params.prefix)) { return true; } } return false;`,
              params: { prefix: MANAGED_WATCHLIST_ID_PREFIX },
            },
          },
        },
      },
    },
  },
  withoutSource: { missing: { field: SOURCE_FIELD } },
  withMultipleSources: {
    filter: { script: { script: { source: `doc['${SOURCE_FIELD}'].size() > 1` } } },
  },
  byCreator: {
    terms: { field: 'entity.created_by', size: SMALL_TERMS_SIZE, missing: LOGS_EXTRACTION_CREATOR },
  },
  ...(TYPES_WITH_IDENTITY_PROVIDER.includes(entityType)
    ? { byIdentityProvider: { terms: { field: 'entity.namespace', size: SMALL_TERMS_SIZE } } }
    : {}),
  activity: {
    filters: {
      filters: {
        seenLast24h: { range: { [LAST_SEEN_FIELD]: { gte: 'now-24h' } } },
        seenLast7d: { range: { [LAST_SEEN_FIELD]: { gte: 'now-7d' } } },
        seenLast30d: { range: { [LAST_SEEN_FIELD]: { gte: 'now-30d' } } },
        notSeenIn30d: { range: { [LAST_SEEN_FIELD]: { lt: 'now-30d' } } },
      },
    },
  },
  criticality: { terms: { field: 'asset.criticality', size: 10 } },
  onAnyWatchlist: { filter: { exists: { field: WATCHLISTS_FIELD } } },
  relationships: {
    filters: {
      filters: Object.fromEntries(
        ENTITY_RELATIONSHIP_COLLECT_LEAVES.map((rel) => [
          rel,
          { exists: { field: `entity.relationships.${rel}.ids` } },
        ])
      ),
    },
  },
  ...Object.fromEntries(
    BOOLEAN_ATTRIBUTES.map((attribute) => [
      `attr_${attribute}`,
      { terms: { field: `entity.attributes.${attribute}`, size: 2 } },
    ])
  ),
});

export const parseCheapPass = (
  aggs: MetadataAggs | undefined,
  entityType: EntityType,
  totalEntities: number,
  fleetPackages: ReadonlySet<string>
): CheapPassResult => {
  const sources = new Map<string, SourceState>();
  for (const bucket of aggs?.sources?.buckets ?? []) {
    if (bucket.key === undefined) continue;
    const source = String(bucket.key);
    sources.set(source, {
      source,
      sourceKind: toSourceKind(source, fleetPackages),
      entities: bucket.doc_count ?? 0,
      resolved: countOf(bucket.resolved),
      withRiskScore: countOf(bucket.withRiskScore),
      onWatchlist: {
        managed: countOf(bucket.watchlistManaged),
        custom: countOf(bucket.watchlistCustom),
      },
    });
  }

  const criticality = bucketCounts(aggs?.criticality?.buckets);
  const activity = aggs?.activity?.buckets ?? {};
  const relationships = aggs?.relationships?.buckets ?? {};

  const metadata: MetadataPayload = {
    totalEntities,
    origin: {
      withMultipleSources: countOf(aggs?.withMultipleSources),
      withoutSource: countOf(aggs?.withoutSource),
      byCreator: [...bucketCounts(aggs?.byCreator?.buckets)].map(([creator, entities]) => ({
        creator,
        entities,
      })),
      ...(TYPES_WITH_IDENTITY_PROVIDER.includes(entityType)
        ? {
            byIdentityProvider: [...bucketCounts(aggs?.byIdentityProvider?.buckets)].map(
              ([provider, entities]) => ({ provider, entities })
            ),
          }
        : {}),
    },
    unlinkedDuplicates: {},
    resolution: { groupSizes: [] },
    activity: {
      seenLast24h: countOf(activity.seenLast24h),
      seenLast7d: countOf(activity.seenLast7d),
      seenLast30d: countOf(activity.seenLast30d),
      notSeenIn30d: countOf(activity.notSeenIn30d),
    },
    securityContext: {
      onAnyWatchlist: countOf(aggs?.onAnyWatchlist),
      criticality: {
        lowImpact: criticality.get('low_impact') ?? 0,
        mediumImpact: criticality.get('medium_impact') ?? 0,
        highImpact: criticality.get('high_impact') ?? 0,
        extremeImpact: criticality.get('extreme_impact') ?? 0,
      },
    },
    enrichment: {
      attributes: BOOLEAN_ATTRIBUTES.map((attribute) => {
        const counts = bucketCounts(aggs?.[`attr_${attribute}`]?.buckets);
        return {
          attribute,
          setTrue: counts.get('true') ?? 0,
          setFalse: counts.get('false') ?? 0,
        };
      }),
      relationships: ENTITY_RELATIONSHIP_COLLECT_LEAVES.map((type) => ({
        type,
        entities: countOf(relationships[type]),
      })),
    },
  };

  return { metadata, sources };
};

const getCheapPass = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  totalEntities: number,
  fleetPackages: ReadonlySet<string>,
  signal: AbortSignal
): Promise<CheapPassResult> => {
  const response = await esClient.search<unknown, MetadataAggs>(
    {
      index,
      size: 0,
      track_total_hits: false,
      query: { term: { [TYPE_FIELD]: entityType } },
      aggs: buildCheapPassAggs(entityType),
    },
    { signal }
  );
  return parseCheapPass(response?.aggregations, entityType, totalEntities, fleetPackages);
};

const esqlRows = async (
  esClient: ElasticsearchClient,
  query: string,
  signal: AbortSignal
): Promise<Array<Record<string, unknown>>> => {
  const { columns, values } = await executeEsqlQuery({ esClient, query, signal });
  return values.map((row) =>
    Object.fromEntries(columns.map((column, idx) => [column.name, row[idx]]))
  );
};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
const asStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  return value === null || value === undefined ? [] : [String(value)];
};

const getSameIdDifferentCase = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
): Promise<
  NonNullable<EntityMetadataEventPayload['unlinkedDuplicates']['sameIdDifferentCase']>
> => {
  const [row] = await esqlRows(
    esClient,
    `FROM ${index}
    | WHERE ${TYPE_FIELD} == "${entityType}" AND ${UNTYPED_ID_FIELD} IS NOT NULL
    | STATS n = COUNT(*), ids = COUNT_DISTINCT(${UNTYPED_ID_FIELD}) BY k = TO_LOWER(${UNTYPED_ID_FIELD})
    | WHERE ids > 1
    | STATS groups = COUNT(*), entities = SUM(n), largestGroup = MAX(n)`,
    signal
  );
  return {
    groups: asNumber(row?.groups),
    entities: asNumber(row?.entities),
    largestGroup: asNumber(row?.largestGroup),
  };
};

type SharedValuePair = NonNullable<
  EntityMetadataEventPayload['unlinkedDuplicates']['sameValueAcrossSources']
>[number];

const getSharedValuePairs = async (
  esClient: ElasticsearchClient,
  index: string,
  field: (typeof SHARED_VALUE_FIELDS)[number],
  signal: AbortSignal
): Promise<SharedValuePair[]> => {
  // TOP (not VALUES) bounds memory per value, like the resolution matcher query.
  const rows = await esqlRows(
    esClient,
    `FROM ${index}
    | WHERE ${TYPE_FIELD} == "user" AND ${field} IS NOT NULL AND ${SOURCE_FIELD} IS NOT NULL
    | EVAL grp = COALESCE(${RESOLVED_TO_FIELD}, entity.id), v = TO_LOWER(${field})
    | MV_EXPAND ${SOURCE_FIELD}
    | MV_EXPAND v
    | STATS srcs = COUNT_DISTINCT(${SOURCE_FIELD}), groups = COUNT_DISTINCT(grp), sources = TOP(${SOURCE_FIELD}, 100) BY v
    | WHERE srcs > 1
    | LIMIT ${SHARED_VALUE_ROW_LIMIT}`,
    signal
  );

  const pairs = new Map<string, SharedValuePair>();
  for (const row of rows) {
    const sources = [...new Set(asStrings(row.sources))]
      .sort()
      .slice(0, MAX_SOURCES_PER_VALUE_FOR_PAIRS);
    const linked = asNumber(row.groups) === 1;
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const key = `${sources[i]}\u0000${sources[j]}`;
        const pair = pairs.get(key) ?? {
          sourceA: sources[i],
          sourceB: sources[j],
          field,
          sharedValues: 0,
          alreadyLinked: 0,
        };
        pair.sharedValues += 1;
        pair.alreadyLinked += linked ? 1 : 0;
        pairs.set(key, pair);
      }
    }
  }
  return [...pairs.values()];
};

/**
 * Painless that returns the identifier a user or host id was built from, by comparing the stored
 * untyped id with each branch of the EUID ranking in order. The store keeps no field for it.
 */
const PRIMARY_IDENTIFIER_SCRIPTS: Partial<Record<EntityType, string>> = {
  user: `
    if (doc['${UNTYPED_ID_FIELD}'].size() == 0) { emit('other'); return; }
    String id = doc['${UNTYPED_ID_FIELD}'].value;
    String ns = doc['entity.namespace'].size() > 0 ? doc['entity.namespace'].value : '';
    if (ns == 'local') { emit('local'); return; }
    for (def v : doc['user.email']) { if (id.equalsIgnoreCase(v + '@' + ns)) { emit('user.email'); return; } }
    for (def v : doc['user.id']) { if (id.equalsIgnoreCase(v + '@' + ns)) { emit('user.id'); return; } }
    if (doc['user.name'].size() > 0) {
      String name = doc['user.name'].value;
      for (def d : doc['user.domain']) { if (id.equalsIgnoreCase(name + '@' + d + '@' + ns)) { emit('user.name@user.domain'); return; } }
      if (id.equalsIgnoreCase(name + '@' + ns)) { emit('user.name'); return; }
    }
    emit('other');
  `,
  host: `
    if (doc['${UNTYPED_ID_FIELD}'].size() == 0) { emit('other'); return; }
    String id = doc['${UNTYPED_ID_FIELD}'].value;
    for (def v : doc['host.id']) { if (id.equalsIgnoreCase(v)) { emit('host.id'); return; } }
    for (def v : doc['host.name']) { if (id.equalsIgnoreCase(v)) { emit('host.name'); return; } }
    for (def v : doc['host.hostname']) { if (id.equalsIgnoreCase(v)) { emit('host.hostname'); return; } }
    emit('other');
  `,
};

interface PrimaryIdentifierResult {
  overall: Array<{ identifier: string; entities: number }>;
  bySource: Map<string, Array<{ identifier: string; entities: number }>>;
}

const getPrimaryIdentifiers = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
): Promise<PrimaryIdentifierResult> => {
  const script = PRIMARY_IDENTIFIER_SCRIPTS[entityType];
  const response = await esClient.search<
    unknown,
    {
      overall?: { buckets?: TermsBucket[] };
      bySource?: { buckets?: Array<TermsBucket & { identifiers?: { buckets?: TermsBucket[] } }> };
    }
  >(
    {
      index,
      size: 0,
      track_total_hits: false,
      query: { term: { [TYPE_FIELD]: entityType } },
      runtime_mappings: {
        primary_identifier: { type: 'keyword', script: { source: script } },
      },
      aggs: {
        overall: { terms: { field: 'primary_identifier', size: 10 } },
        bySource: {
          terms: { field: SOURCE_FIELD, size: SOURCE_TERMS_SIZE },
          aggs: { identifiers: { terms: { field: 'primary_identifier', size: 10 } } },
        },
      },
    },
    { signal }
  );
  const toList = (buckets: TermsBucket[] | undefined) =>
    [...bucketCounts(buckets)].map(([identifier, entities]) => ({ identifier, entities }));
  const bySource = new Map<string, Array<{ identifier: string; entities: number }>>();
  for (const bucket of response?.aggregations?.bySource?.buckets ?? []) {
    if (bucket.key !== undefined) {
      bySource.set(String(bucket.key), toList(bucket.identifiers?.buckets));
    }
  }
  return { overall: toList(response?.aggregations?.overall?.buckets), bySource };
};

interface SourceResolution {
  targets: number;
  standalone: number;
}

const getSourceResolution = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
): Promise<Map<string, SourceResolution>> => {
  const rows = await esqlRows(
    esClient,
    `FROM ${index}
    | WHERE ${TYPE_FIELD} == "${entityType}"
    | EVAL grp = COALESCE(${RESOLVED_TO_FIELD}, entity.id)
    | INLINE STATS members = COUNT(*) BY grp
    | EVAL role = CASE(${RESOLVED_TO_FIELD} IS NOT NULL, "resolved", members > 1, "target", "standalone")
    | WHERE role != "resolved" AND ${SOURCE_FIELD} IS NOT NULL
    | MV_EXPAND ${SOURCE_FIELD}
    | STATS entities = COUNT(*) BY ${SOURCE_FIELD}, role
    | LIMIT ${GROUP_SIZE_ROW_LIMIT}`,
    signal
  );
  const result = new Map<string, SourceResolution>();
  for (const row of rows) {
    const source = String(row[SOURCE_FIELD]);
    const entry = result.get(source) ?? { targets: 0, standalone: 0 };
    if (row.role === 'target') entry.targets += asNumber(row.entities);
    if (row.role === 'standalone') entry.standalone += asNumber(row.entities);
    result.set(source, entry);
  }
  return result;
};

export interface EntityMetadataReports {
  sourceStates: EntitySourceStateEventPayload[];
  metadata: EntityMetadataEventPayload;
}

interface CollectEntityMetadataParams {
  esClient: ElasticsearchClient;
  index: string;
  namespace: string;
  entityType: EntityType;
  totalEntities: number;
  groupSizes: Array<{ size: number; groups: number }>;
  fleetPackages: ReadonlySet<string>;
  signal: AbortSignal;
  deadline: number;
}

/**
 * Builds the source-state and entity-metadata payloads for one entity type. The cheap pass can
 * throw. Each expensive part runs on its own, and one that fails or times out is left out and
 * listed in `collection`.
 */
export const collectEntityMetadata = async ({
  esClient,
  index,
  namespace,
  entityType,
  totalEntities,
  groupSizes,
  fleetPackages,
  signal,
  deadline,
}: CollectEntityMetadataParams): Promise<EntityMetadataReports> => {
  const { metadata, sources } = await getCheapPass(
    esClient,
    index,
    entityType,
    totalEntities,
    fleetPackages,
    signal
  );
  metadata.resolution.groupSizes = groupSizes;

  const part = <T>(name: string, fn: (partSignal: AbortSignal) => Promise<T>) =>
    runPart({ part: name, deadline, taskSignal: signal, fn });

  const collection: Array<CollectionResult<unknown>> = [];

  if (TYPES_WITH_CASE_DUPLICATES.includes(entityType)) {
    const result = await part('sameIdDifferentCase', (s) =>
      getSameIdDifferentCase(esClient, index, entityType, s)
    );
    collection.push(result);
    if (result.result) metadata.unlinkedDuplicates.sameIdDifferentCase = result.result;
  }

  if (entityType === 'user') {
    const allPairs: SharedValuePair[] = [];
    let completed = 0;
    for (const field of SHARED_VALUE_FIELDS) {
      const result = await part(`sameValueAcrossSources.${field}`, (s) =>
        getSharedValuePairs(esClient, index, field, s)
      );
      collection.push(result);
      if (result.result) {
        completed += 1;
        allPairs.push(...result.result);
      }
    }
    if (completed > 0) {
      metadata.unlinkedDuplicates.sameValueAcrossSources = allPairs
        .sort((a, b) => b.sharedValues - a.sharedValues)
        .slice(0, MAX_SHARED_VALUE_PAIRS);
    }
  }

  let primaryIdentifiers: PrimaryIdentifierResult | undefined;
  if (TYPES_WITH_PRIMARY_IDENTIFIER.includes(entityType)) {
    const result = await part('primaryIdentifier', (s) =>
      getPrimaryIdentifiers(esClient, index, entityType, s)
    );
    collection.push(result);
    primaryIdentifiers = result.result;
    if (primaryIdentifiers) {
      metadata.identifiers = { byPrimaryIdentifier: primaryIdentifiers.overall };
    }
  }

  const resolutionResult = await part('sourceResolution', (s) =>
    getSourceResolution(esClient, index, entityType, s)
  );
  collection.push(resolutionResult);

  const sourceStates = [...sources.values()].map((state): EntitySourceStateEventPayload => {
    const resolution = resolutionResult.result?.get(state.source);
    const identifiers = primaryIdentifiers?.bySource.get(state.source);
    return {
      namespace,
      entityType,
      ...state,
      ...(resolutionResult.result
        ? {
            targets: resolution?.targets ?? 0,
            standalone: resolution?.standalone ?? 0,
          }
        : {}),
      ...(identifiers ? { byPrimaryIdentifier: identifiers } : {}),
    };
  });

  return {
    sourceStates,
    metadata: {
      namespace,
      entityType,
      ...metadata,
      collection: collection.map(toCollectionEntry),
    },
  };
};
