/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Log rate histogram item
 */
export interface LogRateHistogramItem {
  /**
   * Time of bucket
   */
  time: number | string;
  /**
   * Number of doc count for that time bucket
   */
  value: number;
}
