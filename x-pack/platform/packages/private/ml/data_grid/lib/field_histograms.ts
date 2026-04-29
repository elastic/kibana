/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Represents a numeric data item.
 */
export interface NumericDataItem {
  /**
   * Numeric key.
   */
  key: number;
  /**
   * Optional string or numeric key.
   */
  key_as_string?: string | number;
  /**
   * Number of documents.
   */
  doc_count: number;
}

/**
 * Represents numeric chart data.
 */
export interface NumericChartData {
  /**
   * Array of numeric data items.
   */
  data: NumericDataItem[];
  /**
   * Identifier of the chart.
   */
  id: string;
  /**
   * Interval value.
   */
  interval: number;
  /**
   * Statistics values.
   */
  stats: [number, number];
  /**
   * Type of the chart data (numeric).
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
 */
export interface OrdinalDataItem {
  /**
   * Key.
   */
  key: string;
  /**
   * Optional key as string.
   */
  key_as_string?: string;
  /**
   * Number of documents.
   */
  doc_count: number;
}

/**
 * Represents ordinal chart data.
 */
export interface OrdinalChartData {
  /**
   * Cardinality value.
   */
  cardinality: number;
  /**
   * Array of ordinal data items.
   */
  data: OrdinalDataItem[];
  /**
   * Identifier of the chart.
   */
  id: string;
  /**
   * Type of the chart data (ordinal or boolean).
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
 */
export interface UnsupportedChartData {
  /**
   * Identifier of the chart.
   */
  id: string;
  /**
   * Type of the chart data (unsupported).
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
 */
export type ChartDataItem = NumericDataItem | OrdinalDataItem;

/**
 * Represents chart data that can be either numeric, ordinal, or unsupported.
 */
export type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;
