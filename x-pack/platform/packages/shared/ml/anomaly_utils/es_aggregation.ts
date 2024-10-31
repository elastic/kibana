/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enum for ES aggregations.
 */
export enum ES_AGGREGATION {
  COUNT = 'count',
  AVG = 'avg',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  PERCENTILES = 'percentiles',
  CARDINALITY = 'cardinality',
}
