/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { isIndexPattern } from '../../common/ai_index_dest';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { probeColumns } from '../ai_indices/ki_list';
import { aiIndicesIndexName, type StoredAiIndexDocument } from '../ai_indices/storage';
import { formatErrorMessage } from '../utils/format_es_error';

/** Upper bound on AI index entries read per collection. */
const MAX_COLLECTED_AI_INDICES = 10_000;
const COUNT_KIS_CONCURRENCY = 5;

const KI_LIFECYCLE_BUCKETS = ['active', 'expired', 'deleted'] as const;
type KiLifecycleBucket = (typeof KI_LIFECYCLE_BUCKETS)[number];

interface KiLifecycleCounts {
  active: number;
  expired: number;
  deleted: number;
}

export interface ContextEngineUsage {
  ai_indices: {
    user: number;
    managed: number;
  };
  kis: {
    user: KiLifecycleCounts;
    managed: KiLifecycleCounts;
  };
}

const emptyKiCounts = (): KiLifecycleCounts => ({ active: 0, expired: 0, deleted: 0 });

const isKiLifecycleBucket = (value: unknown): value is KiLifecycleBucket =>
  KI_LIFECYCLE_BUCKETS.includes(value as KiLifecycleBucket);

/** Latest revision per KI, bucketed by lifecycle status; each clause is guarded by the probed columns. */
const kiLifecycleCountsQuery = (dest: AiIndexDest, columns: Set<string>): string => {
  const key = dest.type === 'data_stream' ? 'id' : '_index, id';
  const status = columns.has('governance.lifecycle.status')
    ? 'governance.lifecycle.status == "deleted"'
    : 'false';
  const expired = columns.has('expires_at') ? 'expires_at <= NOW()' : 'false';
  return [
    `FROM ${JSON.stringify(dest.value)} METADATA _id, _index`,
    columns.has('id') ? 'EVAL id = COALESCE(id, _id)' : 'EVAL id = _id',
    ...(columns.has('@timestamp')
      ? [
          'EVAL revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
          `INLINE STATS latest = MAX(revision_time) BY ${key}`,
          'WHERE revision_time == latest',
          `INLINE STATS latest_doc = MAX(_id) BY ${key}`,
          'WHERE _id == latest_doc',
        ]
      : []),
    `EVAL lifecycle = CASE(COALESCE(${status}, false), "deleted", COALESCE(${expired}, false), "expired", "active")`,
    'STATS count = COUNT(*) BY lifecycle',
  ].join('\n| ');
};

const countKisByLifecycle = async (
  esClient: ElasticsearchClient,
  dest: AiIndexDest
): Promise<KiLifecycleCounts> => {
  const counts = emptyKiCounts();
  const columns = await probeColumns(esClient, dest.value);
  if (columns === undefined) {
    return counts;
  }
  const response = (await esClient.esql.query({
    query: kiLifecycleCountsQuery(dest, new Set(columns)),
  })) as unknown as ESQLSearchResponse;
  const countIndex = response.columns.findIndex(({ name }) => name === 'count');
  const lifecycleIndex = response.columns.findIndex(({ name }) => name === 'lifecycle');
  for (const row of response.values) {
    const lifecycle = row[lifecycleIndex];
    if (isKiLifecycleBucket(lifecycle)) {
      counts[lifecycle] = Number(row[countIndex]);
    }
  }
  return counts;
};

const addCounts = (target: KiLifecycleCounts, source: KiLifecycleCounts): void => {
  for (const bucket of KI_LIFECYCLE_BUCKETS) {
    target[bucket] += source[bucket];
  }
};

const fetchContextEngineUsage = async ({
  esClient,
  getManagedDest,
  logger,
}: {
  esClient: ElasticsearchClient;
  getManagedDest: (id: string) => AiIndexDest | undefined;
  logger: Logger;
}): Promise<ContextEngineUsage> => {
  const response = await esClient.search<StoredAiIndexDocument>({
    index: aiIndicesIndexName,
    ignore_unavailable: true,
    size: MAX_COLLECTED_AI_INDICES,
    track_total_hits: false,
    _source: ['id', 'managed', 'dest'],
  });

  const usage: ContextEngineUsage = {
    ai_indices: { user: 0, managed: 0 },
    kis: { user: emptyKiCounts(), managed: emptyKiCounts() },
  };
  // A dest shared by several entries, such as a managed AI index bootstrapped in many spaces, is counted once.
  const destOwners = new Map<string, { dest: AiIndexDest; owner: 'user' | 'managed' }>();
  for (const hit of response.hits.hits) {
    const source = hit._source;
    if (source === undefined) {
      continue;
    }
    const owner = source.managed === true ? 'managed' : 'user';
    usage.ai_indices[owner] += 1;
    const id = source.id ?? hit._id;
    const dest = owner === 'managed' && id !== undefined ? getManagedDest(id) : source.dest;
    // A dest shared by managed and user entries counts as managed.
    if (
      dest !== undefined &&
      !isIndexPattern(dest.value) &&
      (owner === 'managed' || !destOwners.has(dest.value))
    ) {
      destOwners.set(dest.value, { dest, owner });
    }
  }

  const limit = pLimit(COUNT_KIS_CONCURRENCY);
  const results = await Promise.all(
    [...destOwners.values()].map(({ dest, owner }) =>
      limit(async () => {
        try {
          return { owner, counts: await countKisByLifecycle(esClient, dest) };
        } catch (error) {
          logger.debug(`Could not count KIs in [${dest.value}]: ${formatErrorMessage(error)}`);
          return undefined;
        }
      })
    )
  );
  for (const result of results) {
    if (result !== undefined) {
      addCounts(usage.kis[result.owner], result.counts);
    }
  }
  return usage;
};

export const registerContextEngineUsageCollector = ({
  usageCollection,
  getEsClient,
  getManagedDest,
  logger,
}: {
  usageCollection?: UsageCollectionSetup;
  getEsClient: () => Promise<ElasticsearchClient>;
  getManagedDest: (id: string) => AiIndexDest | undefined;
  logger: Logger;
}): void => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<ContextEngineUsage>({
    type: 'context_engine',
    isReady: () => true,
    schema: {
      ai_indices: {
        user: {
          type: 'long',
          _meta: { description: 'Number of user-created AI indices across all spaces' },
        },
        managed: {
          type: 'long',
          _meta: {
            description:
              'Number of managed AI index entries across all spaces; one per space the managed AI index is bootstrapped in',
          },
        },
      },
      kis: {
        user: {
          active: {
            type: 'long',
            _meta: { description: 'Number of active, unexpired KIs in user-created AI indices' },
          },
          expired: {
            type: 'long',
            _meta: {
              description: 'Number of active KIs past their expires_at in user-created AI indices',
            },
          },
          deleted: {
            type: 'long',
            _meta: {
              description: 'Number of KIs with lifecycle status deleted in user-created AI indices',
            },
          },
        },
        managed: {
          active: {
            type: 'long',
            _meta: { description: 'Number of active, unexpired KIs in managed AI indices' },
          },
          expired: {
            type: 'long',
            _meta: {
              description: 'Number of active KIs past their expires_at in managed AI indices',
            },
          },
          deleted: {
            type: 'long',
            _meta: {
              description: 'Number of KIs with lifecycle status deleted in managed AI indices',
            },
          },
        },
      },
    },
    fetch: async () =>
      fetchContextEngineUsage({ esClient: await getEsClient(), getManagedDest, logger }),
  });

  usageCollection.registerCollector(collector);
};
