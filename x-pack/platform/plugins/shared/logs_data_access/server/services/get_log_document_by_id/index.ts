/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export function createGetLogDocumentById() {
  return async ({
    esClient,
    index,
    id,
  }: {
    esClient: ElasticsearchClient;
    index: string[];
    id: string[];
  }) => {
    const result = await esClient.search({
      index,
      size: 1,
      terminate_after: 1,
      track_total_hits: false,
      query: { ids: { values: id } },
      fields: [{ field: '*', include_unmapped: true }],
    });

    const hit = result.hits.hits[0];
    return hit
      ? { _index: hit._index, _id: hit._id, _source: hit._source, fields: hit.fields }
      : undefined;
  };
}
