/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SHORT_TERM_MEMORY_DATA_STREAM, SHORT_TERM_MEMORY_TYPES } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { buildMemorySpaceFilter } from '../memory_document';

const PAGE_SIZE = 500;

export interface DreamWindow {
  /** The latest revision of each memory written in the window. */
  memories: StoredMemoryDocument[];
  /** Set when the window was cut short; the next run should start from here. */
  truncatedAt?: string;
}

const buildWindowFilter = ({
  spaceId,
  from,
  to,
}: {
  spaceId: string;
  from?: string;
  to?: string;
}) => [
  buildMemorySpaceFilter(spaceId),
  { terms: { type: [...SHORT_TERM_MEMORY_TYPES] } },
  {
    range: {
      '@timestamp': { ...(from ? { gt: from } : {}), ...(to ? { lte: to } : {}) },
    },
  },
];

/** Counts short-term memory revisions written after `from`; a revised memory counts once per revision. */
export const countShortTermRevisions = async ({
  esClient,
  spaceId,
  from,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  from?: string;
  signal?: AbortSignal;
}): Promise<number> => {
  const { count } = await esClient.count(
    {
      index: SHORT_TERM_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: { bool: { filter: buildWindowFilter({ spaceId, from }) } },
    },
    { signal }
  );
  return count;
};

/**
 * Reads short-term memory revisions written after `from` and up to `to`, oldest first, keeping
 * the latest revision of each memory. Stops after `maxMemories` distinct memories, but always
 * finishes the timestamp it stopped on, so the next run can start after it.
 */
export const readDreamWindow = async ({
  esClient,
  spaceId,
  from,
  to,
  maxMemories,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  from?: string;
  to: string;
  maxMemories: number;
  signal?: AbortSignal;
}): Promise<DreamWindow> => {
  const latestById = new Map<string, StoredMemoryDocument>();
  let searchAfter: SortResults | undefined;
  let stopAfterTimestamp: string | undefined;

  for (;;) {
    signal?.throwIfAborted();
    const response = await esClient.search<StoredMemoryDocument>(
      {
        index: SHORT_TERM_MEMORY_DATA_STREAM,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: PAGE_SIZE,
        track_total_hits: false,
        sort: [{ '@timestamp': 'asc' as const }, { id: 'asc' as const }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: { bool: { filter: buildWindowFilter({ spaceId, from, to }) } },
      },
      { signal }
    );

    const { hits } = response.hits;
    for (const { _source: source, sort } of hits) {
      searchAfter = sort;
      if (!source) {
        continue;
      }
      if (stopAfterTimestamp !== undefined && source['@timestamp'] !== stopAfterTimestamp) {
        return { memories: [...latestById.values()], truncatedAt: stopAfterTimestamp };
      }
      latestById.set(source.id, source);
      if (stopAfterTimestamp === undefined && latestById.size >= maxMemories) {
        stopAfterTimestamp = source['@timestamp'];
      }
    }

    if (hits.length < PAGE_SIZE) {
      return { memories: [...latestById.values()] };
    }
  }
};
