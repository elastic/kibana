/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const combineRangeWithFilters = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters: string | undefined
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
  const filtersObj = JSON.parse(filters);
  const clientFiltersList = Array.isArray(filtersObj?.bool?.filter ?? {})
    ? // i.e. {"bool":{"filter":{ ...some nested filter objects }}}
      filtersObj.bool.filter
    : // i.e. {"bool":{"filter":[ ...some listed filter objects ]}}
      Object.keys(filtersObj?.bool?.filter ?? {}).map(key => ({
        ...filtersObj?.bool?.filter?.[key],
      }));
  filtersObj.bool.filter = [...clientFiltersList, range];
  return filtersObj;
};
