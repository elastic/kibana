/**
 * Human-readable labels for validation error types
 */
export declare const validationErrorTypeLabels: {
    non_namespaced_field: string;
    reserved_field: string;
    type_mismatch: string;
    mixed_type: string;
    invalid_value: string;
    invalid_field_name: string;
    forbidden_processor: string;
    invalid_processor_placement: string;
};
/**
 * List of special fields that are allowed without namespacing (from kbn-streams-schema)
 * These are OTel standard fields that don't require custom namespace prefixes
 */
export declare const KEEP_FIELDS: readonly ["@timestamp", "observed_timestamp", "trace_id", "span_id", "severity_text", "body", "severity_number", "event_name", "dropped_attributes_count", "scope", "scope.name", "body.text", "body.structured", "resource.schema_url", "resource.dropped_attributes_count"];
/**
 * Valid namespace prefixes for custom fields in wired streams
 */
export declare const NAMESPACE_PREFIXES: readonly ["body.structured.", "attributes.", "scope.attributes.", "resource.attributes."];
