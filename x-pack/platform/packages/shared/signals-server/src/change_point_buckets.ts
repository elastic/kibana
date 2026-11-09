/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `change_point` rejects a date histogram outside this range. Same bounds as significant events. */
export const MIN_CHANGE_POINT_BUCKETS = 22;
export const MAX_CHANGE_POINT_BUCKETS = 1000;

export const isWithinChangePointBucketRange = (bucketCount: number): boolean =>
  Number.isInteger(bucketCount) &&
  bucketCount >= MIN_CHANGE_POINT_BUCKETS &&
  bucketCount <= MAX_CHANGE_POINT_BUCKETS;
