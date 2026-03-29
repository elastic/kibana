/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FRESHNESS_THRESHOLDS } from '../constants';
import type { DataSourceStats, FreshnessCategory } from '../types';

export async function fetchIndexStats(
  esClient: ElasticsearchClient,
  names: string[]
): Promise<Map<string, DataSourceStats>> {
  if (names.length === 0) {
    return new Map();
  }

  const [statsResult, freshnessResult] = await Promise.all([
    esClient.indices.stats({
      index: names.join(','),
      metric: ['docs', 'store'],
    }),
    fetchFreshness(esClient, names),
  ]);

  const result = new Map<string, DataSourceStats>();

  for (const name of names) {
    const indexStats = statsResult.indices?.[name];
    const docCount = indexStats?.primaries?.docs?.count ?? 0;
    const sizeBytes = indexStats?.primaries?.store?.size_in_bytes ?? 0;
    const lastIngestedAt = freshnessResult.get(name) ?? null;

    result.set(name, {
      doc_count: docCount,
      size_bytes: sizeBytes,
      last_ingested_at: lastIngestedAt,
      is_active: isActive(lastIngestedAt),
      freshness_category: computeFreshness(lastIngestedAt),
    });
  }

  return result;
}

async function fetchFreshness(
  esClient: ElasticsearchClient,
  names: string[]
): Promise<Map<string, string | null>> {
  const searches = names.flatMap((name) => [
    { index: name },
    {
      size: 0,
      aggs: { max_timestamp: { max: { field: '@timestamp' } } },
    },
  ]);

  const msearchResult = await esClient.msearch({ searches });
  const result = new Map<string, string | null>();

  for (let i = 0; i < names.length; i++) {
    const response = msearchResult.responses[i];
    if ('aggregations' in response && response.aggregations) {
      const maxTs =
        (response.aggregations.max_timestamp as { value_as_string?: string })?.value_as_string ??
        null;
      result.set(names[i], maxTs);
    } else {
      result.set(names[i], null);
    }
  }

  return result;
}

function isActive(lastIngestedAt: string | null): boolean {
  if (!lastIngestedAt) return false;
  const diff = Date.now() - new Date(lastIngestedAt).getTime();
  return diff < FRESHNESS_THRESHOLDS.stale;
}

function computeFreshness(lastIngestedAt: string | null): FreshnessCategory {
  if (!lastIngestedAt) return 'empty';
  const diff = Date.now() - new Date(lastIngestedAt).getTime();
  if (diff < FRESHNESS_THRESHOLDS.live) return 'live';
  if (diff < FRESHNESS_THRESHOLDS.recent) return 'recent';
  if (diff < FRESHNESS_THRESHOLDS.stale) return 'stale';
  return 'empty';
}
