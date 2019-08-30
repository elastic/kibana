/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

const LOAD_BUCKETS_PER_PAGE = 100;
const UNKNOWN_BUFFER_INTERVAL = {
  start: null,
  end: null,
  bucketSize: 0,
};

export const useLogSummaryBufferInterval = (midpointTime: number | null, intervalSize: number) => {
  return useMemo(() => {
    if (midpointTime === null || intervalSize <= 0) {
      return UNKNOWN_BUFFER_INTERVAL;
    }

    const halfIntervalSize = intervalSize / 2;

    return {
      start: (Math.floor((midpointTime - halfIntervalSize) / intervalSize) - 0.5) * intervalSize,
      end: (Math.ceil((midpointTime + halfIntervalSize) / intervalSize) + 0.5) * intervalSize,
      bucketSize: intervalSize / LOAD_BUCKETS_PER_PAGE,
    };
  }, [midpointTime, intervalSize]);
};
