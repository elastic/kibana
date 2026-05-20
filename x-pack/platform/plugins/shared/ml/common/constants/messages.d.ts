import type { DocLinksStart } from '@kbn/core/public';
import { VALIDATION_STATUS } from '@kbn/ml-validators';
export type MessageId = keyof ReturnType<typeof getMessages>;
export interface JobValidationMessageDef {
    status: VALIDATION_STATUS;
    text: string;
    url?: string;
    heading?: string;
}
export type JobValidationMessageId = MessageId | 'model_memory_limit_invalid' | 'model_memory_limit_valid' | 'model_memory_limit_units_invalid' | 'model_memory_limit_units_valid' | 'query_delay_invalid' | 'query_delay_valid' | 'frequency_valid' | 'frequency_invalid' | string;
export type JobValidationMessage = {
    id: JobValidationMessageId;
    url?: string;
    fieldName?: string;
    modelPlotCardinality?: number;
} & {
    [key: string]: any;
};
export declare const getMessages: (docLinks?: DocLinksStart) => {
    categorizer_detector_missing_per_partition_field: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    categorizer_varying_per_partition_fields: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    field_not_aggregatable: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    fields_not_aggregatable: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_no_results: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
    };
    cardinality_field_not_exists: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_by_field: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_over_field_low: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_over_field_high: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_partition_field: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    cardinality_model_plot_high: {
        status: VALIDATION_STATUS;
        text: string;
    };
    categorization_filters_valid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    categorization_filters_invalid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    bucket_span_empty: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    bucket_span_estimation_mismatch: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    bucket_span_high: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    bucket_span_valid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    bucket_span_invalid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    detectors_duplicates: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    detectors_empty: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    detectors_function_empty: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    detectors_function_not_empty: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    index_fields_invalid: {
        status: VALIDATION_STATUS;
        text: string;
    };
    index_fields_valid: {
        status: VALIDATION_STATUS;
        text: string;
    };
    influencer_high: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    influencer_low: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    influencer_low_suggestion: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    influencer_low_suggestions: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_id_empty: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_id_invalid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_id_invalid_max_length: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_id_valid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_group_id_invalid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_group_id_invalid_max_length: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    job_group_id_valid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    missing_summary_count_field_name: {
        status: VALIDATION_STATUS;
        text: string;
    };
    skipped_extended_tests: {
        status: VALIDATION_STATUS;
        text: string;
    };
    success_cardinality: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    success_bucket_span: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    success_influencers: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    estimated_mml_greater_than_max_mml: {
        status: VALIDATION_STATUS;
        text: string;
    };
    mml_greater_than_effective_max_mml: {
        status: VALIDATION_STATUS;
        text: string;
    };
    mml_greater_than_max_mml: {
        status: VALIDATION_STATUS;
        text: string;
    };
    mml_value_invalid: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    half_estimated_mml_greater_than_mml: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    estimated_mml_greater_than_mml: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    success_mml: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
        url: string | undefined;
    };
    success_time_range: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
    };
    time_field_invalid: {
        status: VALIDATION_STATUS;
        text: string;
    };
    time_range_short: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
    };
    time_range_before_epoch: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
    };
    datafeed_preview_no_documents: {
        status: VALIDATION_STATUS;
        heading: string;
        text: string;
    };
    datafeed_preview_failed: {
        status: VALIDATION_STATUS;
        text: string;
    };
};
export declare const parseMessages: (validationMessages: JobValidationMessage[], docLinks: DocLinksStart) => JobValidationMessage[];
