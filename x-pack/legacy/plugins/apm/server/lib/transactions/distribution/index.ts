/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { calculateBucketSize } from './calculate_bucket_size';
import { getBuckets } from './get_buckets';

export type ITransactionDistributionAPIResponse = PromiseReturnType<
  typeof getDistribution
>;
export async function getDistribution(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  traceId: string,
  setup: Setup
) {
  const bucketSize = await calculateBucketSize(
    serviceName,
    transactionName,
    transactionType,
    setup
  );

  const { defaultSample, buckets, totalHits } = await getBuckets(
    serviceName,
    transactionName,
    transactionType,
    transactionId,
    traceId,
    bucketSize,
    setup
  );

  return {
    totalHits,
    buckets,
    bucketSize,
    defaultSample
  };
}
