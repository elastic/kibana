import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { DateHistogramTextBasedExpressionFunction } from '../../defs/date_histogram/types';
/**
 * Prepares an ES|QL date histogram for the XY chart. Tables
 * without a date histogram column are returned unchanged.
 */
export declare const dateHistogramTextBasedFn: (getDatatableUtilities: (context: ExecutionContext) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>, getTimezone: (context: ExecutionContext) => string | Promise<string>) => DateHistogramTextBasedExpressionFunction["fn"];
