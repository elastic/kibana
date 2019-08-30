/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getRange = (dateRangeStart: string, dateRangeEnd: string) => ({
  range: {
    '@timestamp': {
      gte: dateRangeStart,
      lte: dateRangeEnd,
    },
  },
});

export const getFilterClause = (
  dateRangeStart: string,
  dateRangeEnd: string,
  additionalKeys?: Array<{ [key: string]: any }>
) =>
  additionalKeys && additionalKeys.length > 0
    ? [getRange(dateRangeStart, dateRangeEnd), ...additionalKeys]
    : [getRange(dateRangeStart, dateRangeEnd)];
