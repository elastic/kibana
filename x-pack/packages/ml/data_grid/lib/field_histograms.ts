/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Represents a numeric data item.
 * @export
 * @interface NumericDataItem
 * @typedef {NumericDataItem}
 */
export interface NumericDataItem {
  /**
   * Numeric key.
   * @type {number}
   */
  key: number;
  /**
   * Optional string or numeric key.
   * @type {?(string | number)}
   */
  key_as_string?: string | number;
  /**
   * Number of documents.
   * @type {number}
   */
  doc_count: number;
}

/**
 * Represents numeric chart data.
 * @export
 * @interface NumericChartData
 * @typedef {NumericChartData}
 */
export interface NumericChartData {
  /**
   * Array of numeric data items.
   * @type {NumericDataItem[]}
   */
  data: NumericDataItem[];
  /**
   * Identifier of the chart.
   * @type {string}
   */
  id: string;
  /**
   * Interval value.
   * @type {number}
   */
  interval: number;
  /**
   * Statistics values.
   * @type {[number, number]}
   */
  stats: [number, number];
  /**
   * Type of the chart data (numeric).
   * @type {'numeric'}
   */
  type: 'numeric';
}

/**
 * Determines if the provided argument is of type NumericChartData.
 * @param {unknown} arg - The argument to check.
 * @returns {arg is NumericChartData}
 */
export const isNumericChartData = (arg: unknown): arg is NumericChartData => {
  return (
    isPopulatedObject(arg, ['data', 'id', 'interval', 'stats', 'type']) && arg.type === 'numeric'
  );
};

/**
 * Represents an ordinal data item.
 * @export
 * @interface OrdinalDataItem
 * @typedef {OrdinalDataItem}
 */
export interface OrdinalDataItem {
  /**
   * Key.
   * @type {string}
   */
  key: string;
  /**
   * Optional key as string.
   * @type {string}
   */
  key_as_string?: string;
  /**
   * Number of documents.
   * @type {number}
   */
  doc_count: number;
}

/**
 * Represents ordinal chart data.
 * @export
 * @interface OrdinalChartData
 * @typedef {OrdinalChartData}
 */
export interface OrdinalChartData {
  /**
   * Cardinality value.
   * @type {number}
   */
  cardinality: number;
  /**
   * Array of ordinal data items.
   * @type {OrdinalDataItem[]}
   */
  data: OrdinalDataItem[];
  /**
   * Identifier of the chart.
   * @type {string}
   */
  id: string;
  /**
   * Type of the chart data (ordinal or boolean).
   * @type {('ordinal' | 'boolean')}
   */
  type: 'ordinal' | 'boolean';
}

/**
 * Determines if the provided argument is of type OrdinalChartData.
 * @param {unknown} arg - The argument to check.
 * @returns {arg is OrdinalChartData}
 */
export const isOrdinalChartData = (arg: unknown): arg is OrdinalChartData => {
  return (
    isPopulatedObject(arg, ['data', 'cardinality', 'id', 'type']) &&
    (arg.type === 'ordinal' || arg.type === 'boolean')
  );
};

/**
 * Represents unsupported chart data.
 * @export
 * @interface UnsupportedChartData
 * @typedef {UnsupportedChartData}
 */
export interface UnsupportedChartData {
  /**
   * Identifier of the chart.
   * @type {string}
   */
  id: string;
  /**
   * Type of the chart data (unsupported).
   * @type {'unsupported'}
   */
  type: 'unsupported';
}

/**
 * Determines if the provided argument is of type UnsupportedChartData.
 * @param {unknown} arg - The argument to check.
 * @returns {arg is UnsupportedChartData}
 */
export const isUnsupportedChartData = (arg: unknown): arg is UnsupportedChartData => {
  return isPopulatedObject(arg, ['type']) && arg.type === 'unsupported';
};

/**
 * Represents a chart data item that can be either numeric or ordinal.
 * @export
 * @typedef {ChartDataItem}
 */
export type ChartDataItem = NumericDataItem | OrdinalDataItem;

/**
 * Represents chart data that can be either numeric, ordinal, or unsupported.
 * @export
 * @typedef {ChartData}
 */
export type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;
