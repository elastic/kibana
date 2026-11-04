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
import { latestRevisionPipeline, probeColumns } from '../ai_indices/ki_list';
import { aiIndicesIndexName, type StoredAiIndexDocument } from '../ai_indices/storage';
import { formatErrorMessage } from '../utils/format_es_error';

/** Upper bound on AI index entries read per collection. */
const MAX_COLLECTED_AI_INDICES = 10_000;
const COUNT_KIS_CONCURRENCY = 5;
/** How long to wait on one backing index before giving up on it. */
const ESQL_REQUEST_TIMEOUT_MS = 30_000;

const KI_LIFECYCLE_BUCKETS = ['active', 'expired', 'deleted'] as const;
type KiLifecycleBucket = (typeof KI_LIFECYCLE_BUCKETS)[number];

interface KiLifecycleCounts {
  active: number;
  expired: number;
  deleted: number;
}

interface KiBucketStats {
  total: number;
  max: number;
  min: number;
  avg: number;
}

interface KiStats {
  active: KiBucketStats;
  expired: KiBucketStats;
  deleted: KiBucketStats;
}

export interface ContextEngineUsage {
  ai_indices: {
    user: number;
    managed: number;
  };
  kis: {
    user: KiStats;
    managed: KiStats;
  };
}

const emptyKiCounts = (): KiLifecycleCounts => ({ active: 0, expired: 0, deleted: 0 });

const isKiLifecycleBucket = (value: unknown): value is KiLifecycleBucket =>
  KI_LIFECYCLE_BUCKETS.includes(value as KiLifecycleBucket);

/**
 * Counts the newest revision of each KI into a lifecycle bucket. Unmapped fields are skipped and
 * KIs that failed verification are left out.
 */
const kiLifecycleCountsQuery = (dest: AiIndexDest, columns: Set<string>): string => {
  const hasStatus = columns.has('governance.lifecycle.status');
  const deleted = hasStatus ? 'governance.lifecycle.status == "deleted"' : 'false';
  const failed = hasStatus ? 'governance.lifecycle.status == "verification_failed"' : 'false';
  const expired = columns.has('expires_at') ? 'expires_at <= NOW()' : 'false';
  return [
    `FROM ${JSON.stringify(dest.value)} METADATA _id, _index`,
    ...latestRevisionPipeline(dest, (field) => columns.has(field)),
    `EVAL lifecycle = CASE(COALESCE(${deleted}, false), "deleted", COALESCE(${failed}, false), "verification_failed", COALESCE(${expired}, false), "expired", "active")`,
    'STATS count = COUNT(*) BY lifecycle',
  ].join('\n| ');
};

const countKisByLifecycle = async (
  esClient: ElasticsearchClient,
  dest: AiIndexDest
): Promise<KiLifecycleCounts> => {
  const counts = emptyKiCounts();
  const columns = await probeColumns(esClient, dest.value, {
    requestTimeout: ESQL_REQUEST_TIMEOUT_MS,
  });
  if (columns === undefined) {
    return counts;
  }
  const response = (await esClient.esql.query(
    { query: kiLifecycleCountsQuery(dest, new Set(columns)) },
    { requestTimeout: ESQL_REQUEST_TIMEOUT_MS }
  )) as unknown as ESQLSearchResponse;
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

const bucketStats = (values: number[]): KiBucketStats => {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.length === 0
    ? { total, max: 0, min: 0, avg: 0 }
    : { total, max: Math.max(...values), min: Math.min(...values), avg: total / values.length };
};

/** Total and spread of each lifecycle count across the counted dests. */
const kiStats = (counts: KiLifecycleCounts[]): KiStats => ({
  active: bucketStats(counts.map(({ active }) => active)),
  expired: bucketStats(counts.map(({ expired }) => expired)),
  deleted: bucketStats(counts.map(({ deleted }) => deleted)),
});

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

  const aiIndices = { user: 0, managed: 0 };
  // Every dest counts once.
  const destOwners = new Map<string, { dest: AiIndexDest; owner: 'user' | 'managed' }>();
  for (const hit of response.hits.hits) {
    const source = hit._source;
    if (source === undefined) {
      continue;
    }
    const owner = source.managed === true ? 'managed' : 'user';
    aiIndices[owner] += 1;
    const id = source.id ?? hit._id;
    const dest = owner === 'managed' && id !== undefined ? getManagedDest(id) : source.dest;
    if (dest !== undefined && !isIndexPattern(dest.value) && !destOwners.has(dest.value)) {
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
  const perDestCounts: Record<'user' | 'managed', KiLifecycleCounts[]> = { user: [], managed: [] };
  for (const result of results) {
    if (result !== undefined) {
      perDestCounts[result.owner].push(result.counts);
    }
  }
  return {
    ai_indices: aiIndices,
    kis: {
      user: kiStats(perDestCounts.user),
      managed: kiStats(perDestCounts.managed),
    },
  };
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
    logger.debug('usageCollection plugin unavailable; collector not registered');
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
            total: {
              type: 'long',
              _meta: { description: 'Number of active, unexpired KIs in user-created AI indices' },
            },
            max: {
              type: 'long',
              _meta: { description: 'Most active, unexpired KIs in one user-created AI index' },
            },
            min: {
              type: 'long',
              _meta: { description: 'Fewest active, unexpired KIs in one user-created AI index' },
            },
            avg: {
              type: 'float',
              _meta: { description: 'Average active, unexpired KIs per user-created AI index' },
            },
          },
          expired: {
            total: {
              type: 'long',
              _meta: {
                description:
                  'Number of active KIs past their expires_at in user-created AI indices',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'Most active KIs past their expires_at in one user-created AI index',
              },
            },
            min: {
              type: 'long',
              _meta: {
                description: 'Fewest active KIs past their expires_at in one user-created AI index',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'Average active KIs past their expires_at per user-created AI index',
              },
            },
          },
          deleted: {
            total: {
              type: 'long',
              _meta: {
                description:
                  'Number of KIs with lifecycle status deleted in user-created AI indices',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'Most KIs with lifecycle status deleted in one user-created AI index',
              },
            },
            min: {
              type: 'long',
              _meta: {
                description:
                  'Fewest KIs with lifecycle status deleted in one user-created AI index',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'Average KIs with lifecycle status deleted per user-created AI index',
              },
            },
          },
        },
        managed: {
          active: {
            total: {
              type: 'long',
              _meta: { description: 'Number of active, unexpired KIs in managed AI indices' },
            },
            max: {
              type: 'long',
              _meta: { description: 'Most active, unexpired KIs in one managed AI index' },
            },
            min: {
              type: 'long',
              _meta: { description: 'Fewest active, unexpired KIs in one managed AI index' },
            },
            avg: {
              type: 'float',
              _meta: { description: 'Average active, unexpired KIs per managed AI index' },
            },
          },
          expired: {
            total: {
              type: 'long',
              _meta: {
                description: 'Number of active KIs past their expires_at in managed AI indices',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'Most active KIs past their expires_at in one managed AI index',
              },
            },
            min: {
              type: 'long',
              _meta: {
                description: 'Fewest active KIs past their expires_at in one managed AI index',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'Average active KIs past their expires_at per managed AI index',
              },
            },
          },
          deleted: {
            total: {
              type: 'long',
              _meta: {
                description: 'Number of KIs with lifecycle status deleted in managed AI indices',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'Most KIs with lifecycle status deleted in one managed AI index',
              },
            },
            min: {
              type: 'long',
              _meta: {
                description: 'Fewest KIs with lifecycle status deleted in one managed AI index',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'Average KIs with lifecycle status deleted per managed AI index',
              },
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
