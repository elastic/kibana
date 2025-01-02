/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We expect that metricset and dataset will be aligned where dataset
 * is the full {product}.{metricset}, whereas metricset doesn't include
 * the product, e.g. dataset is elasticsearch.cluster_stats and metricset is
 * just cluster_stats.
 *
 * Unfortunately, this doesn't *always* seem to be the case, and sometimes
 * the "metricset" value is different. For this reason, we've left these
 * two as separate arguments to this function, at least until this is resolved.
 *
 * More info: https://github.com/elastic/kibana/pull/119112/files#r772605936
 *
 * @param  {string} type matches legacy data
 * @param  {string} metricset matches standalone beats
 * @param  {string} dataset matches agent integration data streams
 */
export const createDatasetFilter = (type: string, metricset: string, dataset: string) => ({
  bool: {
    should: [
      {
        term: {
          type,
        },
      },
      {
        term: {
          'metricset.name': metricset,
        },
      },
      {
        term: {
          'data_stream.dataset': dataset,
        },
      },
    ],
    minimum_should_match: 1,
  },
});
