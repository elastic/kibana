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
 *
 * @export
 * @interface BaseUrlConfig
 * @typedef {BaseUrlConfig}
 */
export interface BaseUrlConfig {
  /**
   * The url name of the configuration.
   * @type {string}
   */
  url_name: string;
  /**
   * The url value of the configuration.
   * @type {string}
   */
  url_value: string;
}

/**
 * Extended interface for custom URLs including an optional time range.
 *
 * @export
 * @interface KibanaUrlConfig
 * @typedef {KibanaUrlConfig}
 * @extends {BaseUrlConfig}
 */
export interface KibanaUrlConfig extends BaseUrlConfig {
  /**
   * The optional time range for the custom URL configuration
   * @type {?string}
   */
  time_range?: string;
}

/**
 * Extended interface for custom URLs including a time range.
 *
 * @export
 * @interface KibanaUrlConfigWithTimeRange
 * @typedef {KibanaUrlConfigWithTimeRange}
 * @extends {BaseUrlConfig}
 */
export interface KibanaUrlConfigWithTimeRange extends BaseUrlConfig {
  /**
   * The time range for the custom URL configuration
   * @type {string}
   */
  time_range: string;
}

/**
 * Union type of different custom URL configurations
 *
 * @export
 * @typedef {UrlConfig}
 */
export type UrlConfig = BaseUrlConfig | KibanaUrlConfig;

/**
 * Extended interface of MlAnomalyRecordDoc to include time range information.
 *
 * @export
 * @interface CustomUrlAnomalyRecordDoc
 * @typedef {CustomUrlAnomalyRecordDoc}
 * @extends {MlAnomalyRecordDoc}
 */
export interface CustomUrlAnomalyRecordDoc extends MlAnomalyRecordDoc {
  /**
   * The `earliest` timestamp.
   * @type {string}
   */
  earliest: string;
  /**
   * The `latest` timestamp.
   * @type {string}
   */
  latest: string;
}

/**
 * Type guard to idenfity KibanaUrlConfigWithTimeRange.
 *
 * @export
 * @param {unknown} arg The unknown type to be evaluated
 * @returns {arg is KibanaUrlConfigWithTimeRange} whether arg is of type KibanaUrlConfigWithTimeRange
 */
export function isKibanaUrlConfigWithTimeRange(arg: unknown): arg is KibanaUrlConfigWithTimeRange {
  return (
    isPopulatedObject(arg, ['url_name', 'url_value', 'time_range']) &&
    typeof arg.time_range === 'string'
  );
}
