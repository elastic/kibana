/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createSortClause = (
  sortDirection: 'asc' | 'desc',
  timestampField: string,
  tiebreakerField: string
) => ({
  sort: {
    [timestampField]: {
      order: sortDirection,
      format: 'strict_date_optional_time_nanos',
      numeric_type: 'date_nanos',
    },
    [tiebreakerField]: sortDirection,
  },
});

export const createTimeRangeFilterClauses = (
  startTimestamp: number,
  endTimestamp: number,
  timestampField: string
) => [
  {
    range: {
      [timestampField]: {
        gte: startTimestamp,
        lte: endTimestamp,
        format: 'epoch_millis',
      },
    },
  },
];
