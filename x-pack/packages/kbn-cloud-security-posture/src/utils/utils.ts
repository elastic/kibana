/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { IndexDetails } from '@kbn/cloud-security-posture-common';

export const getFindingsCountAggQuery = () => ({
  count: { terms: { field: 'result.evaluation' } },
});

export const getFindingsCountAggQueryMisconfigurationPreview = () => ({
  count: {
    filters: {
      other_bucket_key: 'other_messages',
      filters: {
        passed: { match: { 'result.evaluation': 'passed' } },
        failed: { match: { 'result.evaluation': 'failed' } },
      },
    },
  },
});

export const getAggregationCount = (
  buckets: Array<estypes.AggregationsStringRareTermsBucketKeys | undefined>
) => {
  const passed = buckets.find((bucket) => bucket?.key === 'passed');
  const failed = buckets.find((bucket) => bucket?.key === 'failed');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
  };
};

export const getMisconfigurationAggregationCount = (
  buckets: Array<estypes.AggregationsStringRareTermsBucketKeys | undefined>
) => {
  const passed = buckets.find((bucket) => bucket?.key === 'passed');
  const failed = buckets.find((bucket) => bucket?.key === 'failed');
  const noStatus = buckets.find((bucket) => bucket?.key === 'other_messages');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
    no_status: noStatus?.doc_count || 0,
  };
};

export const isAllIndicesEmpty = (indices: Array<IndexDetails | undefined>) => {
  const notEmptyIndices = indices.find((indice) => indice?.status !== 'empty');
  return notEmptyIndices ? false : true;
};
