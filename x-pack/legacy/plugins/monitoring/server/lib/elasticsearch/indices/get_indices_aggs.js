/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getIndicesAggs() {
  const aggs = {
    index_total_min: {
      min: { field: 'index_stats.primaries.indexing.index_total' },
    },
    index_total_max: {
      max: { field: 'index_stats.primaries.indexing.index_total' },
    },
    index_rate: {
      bucket_script: {
        buckets_path: {
          min: 'index_total_min',
          max: 'index_total_max',
        },
        script: 'params.max - params.min',
      },
    },
    query_total_min: {
      min: { field: 'index_stats.total.search.query_total' },
    },
    query_total_max: {
      max: { field: 'index_stats.total.search.query_total' },
    },
    search_rate: {
      bucket_script: {
        buckets_path: {
          min: 'query_total_min',
          max: 'query_total_max',
        },
        script: 'params.max - params.min',
      },
    },
    doc_count: {
      max: { field: 'index_stats.primaries.docs.count' },
    },
    data_size: {
      max: { field: 'index_stats.total.store.size_in_bytes' },
    },
  };

  return aggs;
}
