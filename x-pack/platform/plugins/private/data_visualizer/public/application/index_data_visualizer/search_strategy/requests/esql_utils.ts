/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { MAX_PERCENT, PERCENTILE_SPACING } from './constants';

export interface ESQLQuery {
  esql: string;
}

/**
 * Helper function to escape special characters for field names used in ES|QL queries.
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-syntax.html#esql-identifiers
 * @param str
 * @returns "`str`"
 **/
export const getSafeESQLName = (str: string) => {
  return `\`${str}\``;
};

export function isESQLQuery(arg: unknown): arg is ESQLQuery {
  return isPopulatedObject(arg, ['esql']) && typeof arg.esql === 'string';
}
export const PERCENTS = Array.from(
  Array(MAX_PERCENT / PERCENTILE_SPACING + 1),
  (_, i) => i * PERCENTILE_SPACING
);

export const getESQLPercentileQueryArray = (fieldName: string, percents = PERCENTS) =>
  percents.map(
    (p) =>
      `${getSafeESQLName(`${fieldName}_p${p}`)} = PERCENTILE(${getSafeESQLName(fieldName)}, ${p})`
  );
