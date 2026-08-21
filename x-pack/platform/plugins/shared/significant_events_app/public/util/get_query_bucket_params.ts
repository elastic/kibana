/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import moment from 'moment';

export interface QueryBucketParams {
  from: string;
  to: string;
  bucketSize: string;
}

/**
 * Derives ISO from/to and an auto bucket size (~50 buckets) for query-occurrence
 * histogram requests. Returns undefined when bounds or bucket size cannot be computed.
 *
 * Pass the timefilter instance (not a detached `calculateBounds` method). The
 * instance method reads `this.nowProvider`.
 */
export function getQueryBucketParams(
  timefilter: {
    calculateBounds: (range: { from: string; to: string }) => TimeRangeBounds;
  },
  timeState: { start: number; end: number }
): QueryBucketParams | undefined {
  const from = new Date(timeState.start).toISOString();
  const to = new Date(timeState.end).toISOString();

  const { min, max } = timefilter.calculateBounds({ from, to });
  if (!min || !max) {
    return undefined;
  }

  const bucketSize = calculateAuto.near(50, moment.duration(max.diff(min)));
  if (!bucketSize) {
    return undefined;
  }

  return {
    from,
    to,
    bucketSize: `${bucketSize.asSeconds()}s`,
  };
}
