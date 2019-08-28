/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { getBuckets } from './get_buckets';
import { getDistributionMax } from './get_distribution_max';
import { roundToNearestFiveOrTen } from '../../helpers/round_to_nearest_five_or_ten';

function getBucketSize(max: number, { config }: Setup) {
  const minBucketSize: number = config.get<number>(
    'xpack.apm.minimumBucketSize'
  );
  const bucketTargetCount = config.get<number>('xpack.apm.bucketTargetCount');
  const bucketSize = max / bucketTargetCount;
  return roundToNearestFiveOrTen(
    bucketSize > minBucketSize ? bucketSize : minBucketSize
  );
}

export type TransactionDistributionAPIResponse = PromiseReturnType<
  typeof getTransactionDistribution
>;
export async function getTransactionDistribution({
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  setup
}: {
  serviceName: string;
  transactionName: string;
  transactionType: string;
  transactionId: string;
  traceId: string;
  setup: Setup;
}) {
  const distributionMax = await getDistributionMax(
    serviceName,
    transactionName,
    transactionType,
    setup
  );

  if (distributionMax == null) {
    return { totalHits: 0, buckets: [], bucketSize: 0 };
  }

  const bucketSize = getBucketSize(distributionMax, setup);
  const { buckets, totalHits } = await getBuckets(
    serviceName,
    transactionName,
    transactionType,
    transactionId,
    traceId,
    distributionMax,
    bucketSize,
    setup
  );

  return {
    totalHits,
    buckets,
    bucketSize
  };
}
