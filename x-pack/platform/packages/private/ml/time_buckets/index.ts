/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { TimeBucketsConfig, TimeBucketsInterval, TimeRangeBounds } from './time_buckets';
export { getBoundsRoundedToInterval, TimeBuckets } from './time_buckets';
export { useTimeBuckets } from './use_time_buckets';
