/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { MlAnomalyRecordDoc } from './types';

/**
 * Base Interface for basic custom URL.
 */
interface BaseUrlConfig {
  /**
   * The url name of the configuration.
   */
  url_name: string;
  /**
   * The url value of the configuration.
   */
  url_value: string;
}

/**
 * Extended interface for custom URLs including an optional time range.
 */
export interface MlKibanaUrlConfig extends BaseUrlConfig {
  /**
   * The optional time range for the custom URL configuration
   */
  time_range?: string;
  is_custom_time_range?: boolean;
}

/**
 * Extended interface for custom URLs including a time range.
 */
export interface MlKibanaUrlConfigWithTimeRange extends BaseUrlConfig {
  /**
   * The time range for the custom URL configuration
   */
  time_range: string;
}

/**
 * Union type of different custom URL configurations
 */
export type MlUrlConfig = BaseUrlConfig | MlKibanaUrlConfig;

/**
 * Extended interface of MlAnomalyRecordDoc to include time range information.
 */
export interface MlCustomUrlAnomalyRecordDoc extends MlAnomalyRecordDoc {
  /**
   * The `earliest` timestamp.
   */
  earliest: string;
  /**
   * The `latest` timestamp.
   */
  latest: string;
}

/**
 * Type guard to idenfity MlKibanaUrlConfigWithTimeRange.
 *
 * @param {unknown} arg The unknown type to be evaluated
 * @returns {arg is MlKibanaUrlConfigWithTimeRange} whether arg is of type MlKibanaUrlConfigWithTimeRange
 */
export function isMlKibanaUrlConfigWithTimeRange(
  arg: unknown
): arg is MlKibanaUrlConfigWithTimeRange {
  return (
    isPopulatedObject(arg, ['url_name', 'url_value', 'time_range']) &&
    typeof arg.time_range === 'string'
  );
}
