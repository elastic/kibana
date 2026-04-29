/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Time definition for `GetTimeFieldRangeResponse` start/end attributes.
 */
interface GetTimeFieldRangeResponseTime {
  /**
   * Timestamp
   */
  epoch: number;
  /**
   * String representation
   */
  string: string;
}

/**
 * Response interface for the `setFullTimeRange` function.
 */
export interface GetTimeFieldRangeResponse {
  /**
   * Success boolean flag.
   */
  success: boolean;
  /**
   * Start time of the time range.
   */
  start: GetTimeFieldRangeResponseTime;
  /**
   * End time of the time range.
   */
  end: GetTimeFieldRangeResponseTime;
}
