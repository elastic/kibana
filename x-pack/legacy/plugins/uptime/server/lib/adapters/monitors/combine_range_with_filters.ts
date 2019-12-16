/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const combineRangeWithFilters = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters: Record<string, any>
) => {
  const range = {
    range: {
      '@timestamp': {
        gte: dateRangeStart,
        lte: dateRangeEnd,
      },
    },
  };
  if (!filters) return range;
  const clientFiltersList = Array.isArray(filters?.bool?.filter ?? {})
    ? // i.e. {"bool":{"filter":{ ...some nested filter objects }}}
      filters.bool.filter
    : // i.e. {"bool":{"filter":[ ...some listed filter objects ]}}
      Object.keys(filters?.bool?.filter ?? {}).map(key => ({
        ...filters?.bool?.filter?.[key],
      }));
  filters.bool.filter = [...clientFiltersList, range];
  return filters;
};
