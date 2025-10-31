/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates if aggregation type is currently not supported
 * e.g. any other type other than 'date_histogram' or 'aggregations'
 * @param buckets
 */
export function isUnsupportedAggType(aggType: string) {
  return aggType !== 'date_histogram' && aggType !== 'aggs' && aggType !== 'aggregations';
}
