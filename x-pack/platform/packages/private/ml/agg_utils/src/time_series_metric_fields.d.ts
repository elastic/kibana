import type { DataViewField } from '@kbn/data-views-plugin/common';
/**
 * All available types for time series metric fields
 */
export declare enum TIME_SERIES_METRIC_TYPES {
    HISTOGRAM = "histogram",
    COUNTER = "counter",
    GAUGE = "gauge",
    SUMMARY = "summary"
}
/**
 * Check if DataViewField is a 'counter' time series metric field
 * @param field optional DataViewField
 * @returns a boolean
 */
export declare const isCounterTimeSeriesMetric: (field?: DataViewField) => boolean;
/**
 * Check if DataViewField is a 'gauge' time series metric field
 * @param field optional DataViewField
 * @returns a boolean
 */
export declare const isGaugeTimeSeriesMetric: (field?: DataViewField) => boolean;
