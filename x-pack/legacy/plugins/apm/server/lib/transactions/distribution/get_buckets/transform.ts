/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  const samples = bucket.samples.items.hits.hits.map(
    ({ _source }: { _source: Transaction }) => ({
      traceId: _source.trace.id,
      transactionId: _source.transaction.id
    })
  );

  return {
    key: bucket.key,
    count: bucket.doc_count,
    samples
  };
}

export function bucketTransformer(response: DistributionBucketResponse) {
  const buckets =
    response.aggregations?.distribution.buckets.map(getBucket) || [];

  return {
    noHits: response.hits.total.value === 0,
    buckets
  };
}
