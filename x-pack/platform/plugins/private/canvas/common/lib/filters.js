/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 TODO: This could be pluggable
*/

export function time(filter) {
  if (!filter.column) {
    throw new Error('column is required for Elasticsearch range filters');
  }
  const { from, to, column, filterGroup: group } = filter;
  return {
    group,
    range: { [column]: { gte: from, lte: to } },
  };
}

export function luceneQueryString(filter) {
  return {
    group: filter.filterGroup,
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter) {
  return {
    group: filter.filterGroup,
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}
