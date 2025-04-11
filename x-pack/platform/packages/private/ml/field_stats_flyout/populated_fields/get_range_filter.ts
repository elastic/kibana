/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

interface RangeFilter {
  range: Record<string, estypes.QueryDslRangeQuery>;
}

interface MatchAllFilter {
  bool: { must: { match_all: {} } };
}

/**
 * Get range filter for datetime field. Both arguments are optional.
 * @param datetimeField
 * @param timeRange
 * @returns range filter
 */
export const getRangeFilter = (
  datetimeField?: string,
  timeRange?: TimeRangeMs
): RangeFilter | MatchAllFilter => {
  if (
    datetimeField !== undefined &&
    isPopulatedObject(timeRange, ['from', 'to']) &&
    timeRange.to > timeRange.from
  ) {
    return {
      range: {
        [datetimeField]: {
          gte: timeRange.from,
          lte: timeRange.to,
          format: 'epoch_millis',
        },
      },
    };
  }

  return {
    bool: { must: { match_all: {} } },
  };
};
