/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findIndexMetadata } from '../../common/metadata';
import type { IndexMetadata, IndexSummary } from '../../common/types';

async function getDocCounts(
  esClient: ElasticsearchClient,
  includeHidden: boolean
): Promise<Map<string, number>> {
  const records = await esClient.cat.indices({
    format: 'json',
    h: ['index', 'docs.count'],
    expand_wildcards: includeHidden ? 'all' : ['open', 'hidden'],
  });
  const counts = new Map<string, number>();
  for (const record of records) {
    const { index } = record;
    const count = Number(record['docs.count']);
    if (index && !Number.isNaN(count)) {
      counts.set(index, count);
    }
  }
  return counts;
}

function sumCounts(
  names: string | readonly string[],
  counts: ReadonlyMap<string, number>
): number | undefined {
  let total: number | undefined;
  for (const name of typeof names === 'string' ? [names] : names) {
    const count = counts.get(name);
    if (count !== undefined) {
      total = (total ?? 0) + count;
    }
  }
  return total;
}

/** Lists indices, data streams and aliases visible to the current user, with doc counts. */
export async function listIndices({
  esClient,
  includeHidden,
  metadata,
}: {
  esClient: ElasticsearchClient;
  includeHidden: boolean;
  metadata: Readonly<Record<string, IndexMetadata>>;
}): Promise<IndexSummary[]> {
  const [resolved, counts] = await Promise.all([
    esClient.indices.resolveIndex({
      name: '*',
      expand_wildcards: includeHidden ? 'all' : 'open',
    }),
    getDocCounts(esClient, includeHidden),
  ]);

  const summaries: IndexSummary[] = [
    ...resolved.data_streams.map(({ name, backing_indices: backingIndices }) => ({
      name,
      kind: 'data_stream' as const,
      docsCount: sumCounts(backingIndices, counts),
    })),
    ...resolved.indices
      .filter(({ data_stream: dataStream }) => !dataStream)
      .map(({ name }) => ({ name, kind: 'index' as const, docsCount: counts.get(name) })),
    ...resolved.aliases.map(({ name, indices }) => ({
      name,
      kind: 'alias' as const,
      docsCount: sumCounts(indices, counts),
    })),
  ];

  return summaries
    .map((summary) => {
      const indexMetadata = findIndexMetadata(summary.name, metadata);
      return {
        ...summary,
        title: indexMetadata?.title,
        description: indexMetadata?.description,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
