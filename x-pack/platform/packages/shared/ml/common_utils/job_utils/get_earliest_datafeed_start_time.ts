/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import moment from 'moment';

// The earliest start time for the datafeed should be the max(latest_record_timestamp, latest_bucket.timestamp + bucket_span).
export function getEarliestDatafeedStartTime(
  latestRecordTimestamp: number | undefined,
  latestBucketTimestamp: number | undefined,
  bucketSpan?: Duration | null | undefined
): number | undefined {
  if (latestRecordTimestamp !== undefined && latestBucketTimestamp !== undefined) {
    // if bucket span is available (e.g. 15m) add it to the latest bucket timestamp in ms
    const adjustedBucketStartTime = bucketSpan
      ? moment(latestBucketTimestamp).add(bucketSpan).valueOf()
      : latestBucketTimestamp;
    return Math.max(latestRecordTimestamp, adjustedBucketStartTime);
  } else {
    return latestRecordTimestamp !== undefined ? latestRecordTimestamp : latestBucketTimestamp;
  }
}
