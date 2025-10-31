/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Returns the latest of the last source data and last processed bucket timestamp,
// as used for example in setting the end time of results views for cases where
// anomalies might have been raised after the point at which data ingest has stopped.
export function getLatestDataOrBucketTimestamp(
  latestDataTimestamp: number | undefined,
  latestBucketTimestamp: number | undefined
): number | undefined {
  if (latestDataTimestamp !== undefined && latestBucketTimestamp !== undefined) {
    return Math.max(latestDataTimestamp, latestBucketTimestamp);
  } else {
    return latestDataTimestamp !== undefined ? latestDataTimestamp : latestBucketTimestamp;
  }
}
