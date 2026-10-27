/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesStatsIndicesStats,
  IndicesStatsShardStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { VECTOR_COUNT_ENABLED } from '../../common/constants';
import type { DataPanelAccess, NewIndexDetails } from '../../common/types';

interface ApiKeysStats {
  total: number | null;
  expiring: number | null;
}

interface MeteringIndexStat {
  name: string;
  num_docs: number;
  size_in_bytes: number;
  datastream?: string;
}

interface MeteringDataStreamStat {
  name: string;
}

interface MeteringStatsResponse {
  _total: { num_docs: number; size_in_bytes: number };
  indices?: MeteringIndexStat[];
  datastreams?: MeteringDataStreamStat[];
}

interface MeteredIndices {
  indices: MeteringIndexStat[];
  dataStreams: MeteringDataStreamStat[];
}

type IndexSizeStat = Pick<MeteringIndexStat, 'name' | 'size_in_bytes'>;

type NewIndexCandidate = Omit<NewIndexDetails, 'sizeInBytes'>;

/**
 * A request's value, `null` when it failed, and `hasPrivilege`, which is `false` only when
 * Elasticsearch refused the request with a 403. Any other failure leaves it `true`.
 */
interface RequestResult<T> {
  value: T | null;
  hasPrivilege: boolean;
}

interface ResolvedIndices {
  count: number;
  /** Regular indices plus each data stream's backing indices: the indices index stats reports a size for. */
  indexAndBackingIndexNames: string[];
}

interface IndexStats {
  dataPanelAccess: DataPanelAccess;
  indicesCount: number | null;
  storeSizeBytes: number | null;
  vectorCount: number | null;
  documentsCount: number | null;
  newIndex: NewIndexDetails | null;
}

export interface IndexStatsOptions {
  isServerless: boolean;
  vectorCountEnabled?: boolean;
}

export interface MonitorPrivileges {
  canMonitorAllIndices: boolean;
  canMonitorCluster: boolean;
}

/**
 * `-.*` cannot exclude a data stream by its backing `.ds-` indices, so internal data streams
 * without a leading dot, like the Agent Builder traces stream, are excluded by name. With
 * `expand_wildcards: ['open']` the pattern resolves to regular user indices and the backing
 * indices of user-created data streams only.
 */
const USER_INDICES_PATTERN = ['*', '-.*', '-traces-agent_builder.otel-*'];

/**
 * Reports a 403 as the caller lacking the privilege, and logs any other failure as unavailable.
 * Elasticsearch scopes these requests to the indices the caller holds the privilege on and only
 * refuses a caller who holds it on none.
 */
const handleRequestError = (
  error: { statusCode?: number; message: string },
  logger: Logger,
  description: string
): RequestResult<never> => {
  if (error.statusCode === 403) {
    return { value: null, hasPrivilege: false };
  }
  logger.warn(
    `Failed to ${description} for deployment stats. Returning partial stats: ${error.message}`
  );
  return { value: null, hasPrivilege: true };
};

/**
 * The monitor privileges that gate the vector count, which Elasticsearch does not scope to the
 * caller, and the newest-index lookup, whose `_cat` call requires cluster `monitor`. A single
 * `hasPrivileges` call covers both, and any error denies access rather than granting it.
 */
export const fetchMonitorPrivileges = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<MonitorPrivileges> => {
  try {
    const { cluster, index } = await client.asCurrentUser.security.hasPrivileges({
      cluster: ['monitor'],
      index: [{ names: ['*'], privileges: ['monitor'] }],
    });

    return {
      canMonitorAllIndices: index?.['*']?.monitor === true,
      canMonitorCluster: cluster?.monitor === true,
    };
  } catch (error) {
    logger.warn(
      `Failed to check monitor privileges for deployment stats. Denying access: ${error.message}`
    );
    return { canMonitorAllIndices: false, canMonitorCluster: false };
  }
};

const shardVectorCount = (shard: IndicesStatsShardStats): number =>
  (shard.dense_vector?.value_count ?? 0) + (shard.sparse_vector?.value_count ?? 0);

/**
 * Sums vector counts across indices, counting each logical shard exactly once. Neither of the
 * `_all` rollups is usable in stateless: `primaries` reports nothing for an index whose indexing
 * shard has been released as idle, and `total` counts every shard copy of an active index. The max
 * across a shard's copies tolerates refresh lag between them.
 */
const sumVectorCounts = (indices: Record<string, IndicesStatsIndicesStats> | undefined): number => {
  let count = 0;
  for (const index of Object.values(indices ?? {})) {
    for (const copies of Object.values(index.shards ?? {})) {
      if (copies.length > 0) {
        count += Math.max(...copies.map(shardVectorCount));
      }
    }
  }
  return count;
};

/**
 * Counts indexed dense + sparse vectors across user indices. Returns null when not all shards
 * responded. Kept for when vector counts can be re-enabled or replaced.
 */
export const countVectors = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<number | null> => {
  const { _shards: shards, indices } = await client.asInternalUser.indices.stats({
    index: USER_INDICES_PATTERN,
    expand_wildcards: ['open'],
    level: 'shards',
    metric: ['dense_vector', 'sparse_vector'],
    filter_path: [
      '_shards',
      'indices.*.shards.*.dense_vector.value_count',
      'indices.*.shards.*.sparse_vector.value_count',
    ],
  });

  if (!shards || shards.successful !== shards.total) {
    logger.warn(
      `Vector count covered only ${shards?.successful ?? 0} of ${shards?.total ?? 0} shards.`
    );
    return null;
  }

  return sumVectorCounts(indices);
};

/**
 * Counts top-level documents via `_count`, which matches root documents only. It cannot opt out of
 * partial results, so a failed shard is reported as unavailable rather than an undercount.
 */
const countDocuments = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<RequestResult<number>> => {
  try {
    const { count, _shards: shards } = await client.asCurrentUser.count({
      index: USER_INDICES_PATTERN,
      expand_wildcards: ['open'],
    });

    if (shards.failed > 0) {
      logger.warn(
        `Document count for deployment stats covered only ${shards.total - shards.failed} of ${
          shards.total
        } shards. Reporting it as unavailable rather than as an undercount.`
      );
      return { value: null, hasPrivilege: true };
    }

    return { value: count, hasPrivilege: true };
  } catch (error) {
    return handleRequestError(error, logger, 'compute document count');
  }
};

/**
 * The serverless caller's user indices, user data stream backing indices, and user data streams as billed,
 * which is the only size figure serverless treats as authoritative. The call is authorized as the
 * internal user, so Elasticsearch scopes the rows to the caller from the secondary credential
 * rather than from the request itself.
 */
const fetchMeteredIndices = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<RequestResult<MeteredIndices>> => {
  try {
    const { indices = [], datastreams: dataStreams = [] } =
      await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
        method: 'GET',
        path: `/_metering/stats/${USER_INDICES_PATTERN.join(',')}`,
      });

    return { value: { indices, dataStreams }, hasPrivilege: true };
  } catch (error) {
    // metering 404s with an `index_not_found_exception` when it matches no indices at all. A caller
    // whose privileges match no index gets a 403 instead.
    if (error.body?.error?.type === 'index_not_found_exception') {
      return { value: { indices: [], dataStreams: [] }, hasPrivilege: true };
    }
    return handleRequestError(error, logger, 'fetch metered indices');
  }
};

/** Counts each data stream once, leaving its backing indices out of the index count. */
const countMeteredIndices = ({ indices, dataStreams }: MeteredIndices): number =>
  indices.filter(({ datastream }) => !datastream).length + dataStreams.length;

/**
 * `_metering/stats` is serverless-only, so stateful deployments read sizes from index stats instead.
 * The primaries' `total_data_set_size_in_bytes` is the full size of the data, counted once per shard
 * and including frozen tier indices, which matches what metering reports.
 */
const fetchStatefulIndexSizes = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<RequestResult<IndexSizeStat[]>> => {
  try {
    const { indices } = await client.asCurrentUser.indices.stats({
      index: USER_INDICES_PATTERN,
      expand_wildcards: ['open'],
      metric: ['store'],
      filter_path: ['indices.*.primaries.store.total_data_set_size_in_bytes'],
    });

    const sizes = Object.entries(indices ?? {}).map(([name, stats]) => ({
      name,
      size_in_bytes: stats.primaries?.store?.total_data_set_size_in_bytes ?? 0,
    }));
    return { value: sizes, hasPrivilege: true };
  } catch (error) {
    return handleRequestError(error, logger, 'fetch index sizes');
  }
};

/**
 * Counts the caller's regular user indices plus their user data streams on stateful, each data
 * stream once however many backing indices it has. `_resolve/index` needs `read` or
 * `view_index_metadata`, so the count is not withheld from callers who cannot see sizes. The
 * pattern leaves out backing indices, system data streams, and hidden or internal ones.
 */
const resolveUserIndices = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<RequestResult<ResolvedIndices>> => {
  try {
    const { indices = [], data_streams: dataStreams = [] } =
      await client.asCurrentUser.indices.resolveIndex({
        name: USER_INDICES_PATTERN,
        expand_wildcards: ['open'],
        filter_path: ['indices.name', 'data_streams.name', 'data_streams.backing_indices'],
      });

    const resolved = {
      count: indices.length + dataStreams.length,
      indexAndBackingIndexNames: [
        ...indices.map(({ name }) => name),
        ...dataStreams.flatMap(({ backing_indices: backingIndices = [] }) => backingIndices),
      ],
    };
    return { value: resolved, hasPrivilege: true };
  } catch (error) {
    return handleRequestError(error, logger, 'count indices');
  }
};

/**
 * Whether the sizes come from exactly the indices we counted.
 *
 * Index stats only returns sizes for indices the caller holds `monitor` on, and it fails only when
 * that is none of them. A caller can therefore get sizes for a different set of indices than the
 * ones we counted. For example, `editor` holds `monitor` only on solution indices that our pattern
 * leaves out, so it gets an empty list rather than an error.
 */
const sameIndicesAsCount = (
  indexSizes: IndexSizeStat[],
  indexAndBackingIndexNames: string[]
): boolean => {
  const indexNamesWithSize = new Set(indexSizes.map(({ name }) => name));
  return (
    indexNamesWithSize.size === indexAndBackingIndexNames.length &&
    indexAndBackingIndexNames.every((name) => indexNamesWithSize.has(name))
  );
};

const sumIndexSizes = (indexSizes: IndexSizeStat[]): number =>
  indexSizes.reduce((sum, { size_in_bytes: sizeInBytes }) => sum + (sizeInBytes ?? 0), 0);

const RECENTLY_CREATED_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A leading dot marks a system index or the backing index of a data stream. */
const NON_USER_INDEX_PREFIX = '.';

const isUserIndex = (name: string): boolean => !name.startsWith(NON_USER_INDEX_PREFIX);
/**
 * The newest regular index created within `RECENTLY_CREATED_WINDOW_MS`, or `null` when there is
 * none. Uses `_cat/indices` for the creation date (the only non-operator source in serverless) and
 * `_count` for the document count. The size comes from the same source as `storeSizeBytes` and is
 * attached by `fetchIndexStats`.
 */
export const fetchNewIndex = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<NewIndexCandidate | null> => {
  try {
    const indices = await client.asCurrentUser.cat.indices({
      index: USER_INDICES_PATTERN,
      format: 'json',
      h: ['index', 'creation.date'],
      expand_wildcards: ['open'],
    });

    const cutoff = Date.now() - RECENTLY_CREATED_WINDOW_MS;

    const newest = indices
      .flatMap(({ index, 'creation.date': createdAt }) =>
        index && isUserIndex(index) ? [{ name: index, createdAt: Number(createdAt) }] : []
      )
      .filter(({ createdAt }) => createdAt > cutoff)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!newest) {
      return null;
    }

    const { name, createdAt } = newest;
    const { count } = await client.asCurrentUser.count({ index: name });

    return {
      indexName: name,
      documentsCount: count,
      createdAt,
    };
  } catch (error) {
    // `_cat/indices` also needs index `monitor`, which `hasPrivileges` cannot check up front for a
    // caller who holds it on only some indices. Without it on any index the call is denied.
    if (error.statusCode === 403) {
      return null;
    }
    logger.warn(`Failed to fetch the new index for deployment stats: ${error.message}`);
    return null;
  }
};

interface IndexReads {
  dataPanelAccess: DataPanelAccess;
  indicesCount: number | null;
  documentsCount: number | null;
  indexSizes: IndexSizeStat[] | null;
}

/**
 * Serverless takes the count and sizes from one metering call, so both cover the same indices and
 * the panel needs `monitor`, `view_index_metadata`, `manage`, or `all`. Documents need `read` or
 * `all` on top.
 */
const fetchServerlessIndexReads = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<IndexReads> => {
  const [metered, documents] = await Promise.all([
    fetchMeteredIndices(client, logger),
    countDocuments(client, logger),
  ]);

  return {
    dataPanelAccess: {
      showPanel: metered.hasPrivilege,
      showDocuments: metered.hasPrivilege && documents.hasPrivilege,
      showTotalSize: metered.hasPrivilege,
    },
    indicesCount: metered.value && countMeteredIndices(metered.value),
    documentsCount: documents.value,
    indexSizes: metered.value?.indices ?? null,
  };
};

/**
 * Stateful shows the panel to callers who can count indices, which `read`, `view_index_metadata`,
 * `manage`, or `all` allows. Documents need `read` or `all`. Total size reads index stats, which
 * need `monitor`, `manage`, or `all`, and is shown only when the sizes come from exactly the
 * indices we counted.
 */
const fetchStatefulIndexReads = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<IndexReads> => {
  const [indices, documents, sizes] = await Promise.all([
    resolveUserIndices(client, logger),
    countDocuments(client, logger),
    fetchStatefulIndexSizes(client, logger),
  ]);
  const showPanel = indices.hasPrivilege;
  const sizesMatchCountedIndices =
    !indices.value ||
    !sizes.value ||
    sameIndicesAsCount(sizes.value, indices.value.indexAndBackingIndexNames);

  return {
    dataPanelAccess: {
      showPanel,
      showDocuments: showPanel && documents.hasPrivilege,
      showTotalSize: showPanel && sizes.hasPrivilege && sizesMatchCountedIndices,
    },
    indicesCount: indices.value?.count ?? null,
    documentsCount: documents.value,
    indexSizes: sizes.value,
  };
};

/**
 * Fetches the deployment's index-level stats and which of them the caller may see. Elasticsearch
 * scopes the index, size, and document counts to the caller. The cluster-wide vector count is not
 * scoped to the caller, so it needs index `monitor` over every index. The newest index reads its
 * creation date from `_cat/indices`, which needs cluster `monitor` and index `monitor` on the
 * indices it lists. Every read runs in parallel and is surfaced as `null` on failure, so callers
 * can tell "unavailable" from a genuine `0` and one dead source cannot hide the rest.
 */
export const fetchIndexStats = async (
  client: IScopedClusterClient,
  logger: Logger,
  { canMonitorAllIndices, canMonitorCluster }: MonitorPrivileges,
  { isServerless, vectorCountEnabled = VECTOR_COUNT_ENABLED }: IndexStatsOptions
): Promise<IndexStats> => {
  const [
    { dataPanelAccess, indicesCount, documentsCount, indexSizes },
    vectorCount,
    newIndexCandidate,
  ] = await Promise.all([
    isServerless
      ? fetchServerlessIndexReads(client, logger)
      : fetchStatefulIndexReads(client, logger),
    vectorCountEnabled && canMonitorAllIndices
      ? countVectors(client, logger).catch((error) => {
          logger.warn(
            `Failed to compute vector count for deployment stats. Returning partial stats: ${error.message}`
          );
          return null;
        })
      : null,
    canMonitorCluster ? fetchNewIndex(client, logger) : null,
  ]);

  const storeSizeBytes = indexSizes ? sumIndexSizes(indexSizes) : null;

  // an index metering has not reported yet is still new, and its size is genuinely 0 so far
  const newIndex = newIndexCandidate && {
    ...newIndexCandidate,
    sizeInBytes: indexSizes
      ? indexSizes.find(({ name }) => name === newIndexCandidate.indexName)?.size_in_bytes ?? 0
      : null,
  };

  return { dataPanelAccess, indicesCount, storeSizeBytes, vectorCount, documentsCount, newIndex };
};

/**
 * Keys that Kibana creates on a user's behalf — task manager, alerting, and other internal keys.
 * The `Alerting: ` name prefix covers keys created before `metadata.managed` was introduced.
 */
const MANAGED_KEY_FILTERS = [
  { prefix: { name: { value: 'Alerting: ' } } },
  { term: { 'metadata.managed': true } },
];

/**
 * Mirrors the default view of the Stack Management API keys list, which the card links out to:
 * non-invalidated `rest` keys minus the ones Kibana manages. Without the same exclusions the card
 * reports keys the user cannot see in that list.
 */
const USER_API_KEYS_QUERY = {
  bool: {
    must: [{ term: { invalidated: false } }, { term: { type: 'rest' } }],
    must_not: MANAGED_KEY_FILTERS,
  },
};

const EXPIRING_SOON_WINDOW = '30d';

/**
 * Fetches API key stats: total keys visible to the caller and those expiring within
 * `EXPIRING_SOON_WINDOW`. Returns `null` values on failure.
 */
export const fetchApiKeysStats = async (
  client: IScopedClusterClient,
  logger: Logger
): Promise<ApiKeysStats> => {
  try {
    const { total, aggregations } = await client.asCurrentUser.security.queryApiKeys({
      size: 0,
      query: USER_API_KEYS_QUERY,
      aggs: {
        expiring: {
          filter: { range: { expiration: { gt: 'now', lte: `now+${EXPIRING_SOON_WINDOW}` } } },
        },
      },
    });

    const expiringAggregation = aggregations?.expiring;
    const expiring =
      expiringAggregation && 'doc_count' in expiringAggregation ? expiringAggregation.doc_count : 0;

    return { total, expiring };
  } catch (error) {
    logger.warn(`Failed to fetch API keys stats for deployment stats: ${error.message}`);
    return { total: null, expiring: null };
  }
};
