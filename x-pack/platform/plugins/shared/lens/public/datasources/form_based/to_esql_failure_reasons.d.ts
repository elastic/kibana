/**
 * Specific reasons why ES|QL conversion failed.
 * These are used to provide granular user feedback.
 */
export type EsqlConversionFailureReason = 'multi_layer_not_supported' | 'trend_line_not_supported' | 'formula_not_supported' | 'time_shift_not_supported' | 'runtime_field_not_supported' | 'reduced_time_range_not_supported' | 'function_not_supported' | 'drop_partials_not_supported' | 'include_empty_rows_not_supported' | 'terms_not_supported' | 'saved_to_library_not_supported' | 'unsupported_settings' | 'unknown';
export declare const esqlConversionFailureReasonMessages: Record<EsqlConversionFailureReason, string>;
export declare const getFailureTooltip: (reason: EsqlConversionFailureReason | undefined) => string;
