/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { LONG_TERM_MEMORY_INDEX } from '../../../common/memory';
import { buildMemorySpaceFilter } from '../memory_document';

export const DELETE_PAGE_SIZE = 1000;

/**
 * Deletes every long-term memory of the space, so a rebuild starts from an empty store.
 * Kibana may not refresh the store, so deletes wait for the next refresh instead.
 */
export const deleteLongTermMemories = async ({
  esClient,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
}): Promise<number> => {
  let deleted = 0;
  let ids: string[];
  do {
    const { hits } = await esClient.search(
      {
        index: LONG_TERM_MEMORY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: DELETE_PAGE_SIZE,
        _source: false,
        track_total_hits: false,
        query: buildMemorySpaceFilter(spaceId),
      },
      { signal }
    );
    ids = hits.hits.flatMap(({ _id: id }) => (id ? [id] : []));
    if (ids.length === 0) {
      break;
    }

    const { items } = await esClient.bulk(
      {
        refresh: 'wait_for',
        operations: ids.map((id) => ({ delete: { _index: LONG_TERM_MEMORY_INDEX, _id: id } })),
      },
      { signal }
    );
    const failure = items.find(({ delete: result }) => result?.error && result.status !== 404);
    if (failure?.delete?.error) {
      throw new Error(
        `Failed to delete long-term memory '${failure.delete._id}': ${failure.delete.error.reason}`
      );
    }
    deleted += items.filter(({ delete: result }) => result?.result === 'deleted').length;
  } while (ids.length === DELETE_PAGE_SIZE);
  return deleted;
};
