import { type dateHistogramTextBasedFn } from '../../impl/date_histogram/date_histogram_fn_textbased';
import type { DateHistogramTextBasedExpressionFunction } from './types';
export declare const getDateHistogramTextBased: (...dateHistogramFnParameters: Parameters<typeof dateHistogramTextBasedFn>) => DateHistogramTextBasedExpressionFunction;
