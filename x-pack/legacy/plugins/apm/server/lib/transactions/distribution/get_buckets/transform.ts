/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { PromiseReturnType } from '../../../../../typings/common';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { bucketFetcher } from './fetcher';

type DistributionBucketResponse = PromiseReturnType<typeof bucketFetcher>;

export type IBucket = ReturnType<typeof getBucket>;
function getBucket(
  bucket: Required<
    DistributionBucketResponse
  >['aggregations']['distribution']['buckets'][0]
) {
  const sampleSource = idx(bucket, _ => _.sample.hits.hits[0]._source) as
    | Transaction
    | undefined;
  const isSampled = idx(sampleSource, _ => _.transaction.sampled);
  const sample = {
    traceId: idx(sampleSource, _ => _.trace.id),
    transactionId: idx(sampleSource, _ => _.transaction.id)
  };

  return {
    key: bucket.key,
    count: bucket.doc_count,
    sample: isSampled ? sample : undefined
  };
}

export function bucketTransformer(response: DistributionBucketResponse) {
  const buckets = (
    idx(response.aggregations, _ => _.distribution.buckets) || []
  ).map(getBucket);

  return {
    totalHits: response.hits.total,
    buckets
  };
}
