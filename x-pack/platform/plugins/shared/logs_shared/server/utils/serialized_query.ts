/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';

export const parseFilterQuery = (
  filterQuery: string | null | undefined
): JsonObject | undefined => {
  try {
    if (filterQuery) {
      const parsedFilterQuery = JSON.parse(filterQuery);
      if (
        !parsedFilterQuery ||
        ['string', 'number', 'boolean'].includes(typeof parsedFilterQuery) ||
        Array.isArray(parsedFilterQuery)
      ) {
        throw new Error('expected value to be an object');
      }
      return parsedFilterQuery;
    } else {
      return undefined;
    }
  } catch (err) {
    throw new Error(`Failed to parse query: ${err}`);
  }
};
