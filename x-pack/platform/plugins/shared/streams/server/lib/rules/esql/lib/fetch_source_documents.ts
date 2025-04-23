/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

interface FetchedDocument {
  fields: estypes.SearchHit['fields'];
  _source?: unknown;
  _index: estypes.SearchHit['_index'];
  _version: estypes.SearchHit['_version'];
}

interface Props {
  index: string[];
  esClient: ElasticsearchClient;
  results: Array<Record<string, string | null>>;
}
/**
 * fetches source documents by list of their ids
 * it used for a case when non-aggregating has _id property to enrich alert with source document,
 * if some of the properties missed from resulted query
 */
export const fetchSourceDocuments = async ({
  index,
  results,
  esClient,
}: Props): Promise<Record<string, FetchedDocument>> => {
  const ids = results.map((r) => r._id).filter((id) => id != null) as string[];
  // we will fetch source documents only for non-aggregating rules, since aggregating do not have _id
  if (ids.length === 0) {
    return {};
  }

  const response = await esClient.search<unknown>({
    index,
    ignore_unavailable: true,
    size: ids.length,
    query: {
      bool: {
        filter: [
          {
            ids: { values: ids },
          },
        ],
      },
    },
    _source: true,
    fields: ['*'],
  });

  return response.hits.hits.reduce<Record<string, FetchedDocument>>((acc, hit) => {
    if (hit._id) {
      acc[hit._id] = {
        fields: hit.fields,
        _source: hit._source,
        _index: hit._index,
        _version: hit._version,
      };
    }
    return acc;
  }, {});
};
