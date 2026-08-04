import type { Query } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
export type YamlParseResult = {
    values: FormValues;
    error: null;
} | {
    values: null;
    error: string;
};
interface YamlStateTransition {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
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
    query: Query;
    recovery_strategy?: string;
    no_data_strategy?: string;
    grouping?: {
        fields: string[];
    };
    state_transition?: YamlStateTransition;
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
 * of the create payload at all.
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
