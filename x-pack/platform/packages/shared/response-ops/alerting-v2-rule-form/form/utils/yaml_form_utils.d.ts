import type { FormValues } from '../types';
export interface YamlParseResult {
    values: FormValues | null;
    error: string | null;
}
interface YamlStateTransition {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
}
interface YamlRecoveryPolicy {
    type: string;
    query?: {
        base: string;
    };
}
interface YamlRuleObject {
    kind: string;
    metadata: {
        name: string;
        description?: string;
        owner?: string;
        tags?: string[];
    };
    time_field: string;
    schedule: {
        every: string;
        lookback: string;
    };
    evaluation: {
        query: {
            base: string;
        };
    };
    grouping?: {
        fields: string[];
    };
    state_transition?: YamlStateTransition;
    recovery_policy?: YamlRecoveryPolicy;
    artifacts?: Array<{
        id: string;
        type: string;
        value: string;
    }>;
}
/**
 * Convert FormValues to YAML-compatible object (snake_case keys for API compatibility).
 *
 * Note: `metadata.enabled` is intentionally NOT serialized. The API's `metadataSchema`
 * is strict and only accepts { name, description?, owner?, tags? }; `enabled` lives at
 * the top level of the update/response schemas, never under metadata, and is not part
 * of the create payload at all. The form keeps its own `metadata.enabled` for the
 * Enabled toggle UI; that's stripped by the request mappers before the API call.
 */
export declare const formValuesToYamlObject: (values: FormValues) => YamlRuleObject;
/**
 * Parse YAML string to FormValues (lenient).
 *
 * Parses the YAML structure and extracts all recognised fields, providing
 * safe defaults for any that are missing. YAML syntax errors are still
 * reported. Field-level validation (required name, valid ES|QL, etc.)
 * is handled by RHF at submit time, keeping a single validation pipeline.
 */
export declare const parseYamlToFormValues: (yamlString: string) => YamlParseResult;
/**
 * Serialize current form values to YAML string
 */
export declare const serializeFormToYaml: (values: FormValues) => string;
export {};
