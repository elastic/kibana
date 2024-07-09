/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Change point detection requires a minimum of 22 buckets to be able to run.
const CHANGE_POINT_MIN_BUCKETS = 22;

export const getHistogramIntervalMs = (earliestMs: number, latestMs: number): number => {
  const barTarget = 75;

  const delta = latestMs - earliestMs;

  const dayMs = 86400 * 1000;
  const dayThreshold = dayMs * CHANGE_POINT_MIN_BUCKETS;

  const weekMs = dayMs * 7;
  const weekThreshold = weekMs * CHANGE_POINT_MIN_BUCKETS;

  const monthMs = dayMs * 30;
  const monthThreshold = monthMs * CHANGE_POINT_MIN_BUCKETS;

  let intervalMs = Math.round(delta / barTarget);

  if (delta > monthThreshold) {
    intervalMs = monthMs;
  } else if (delta > weekThreshold) {
    intervalMs = weekMs;
  } else if (delta > dayThreshold) {
    intervalMs = dayMs;
  }

  return intervalMs;
};
