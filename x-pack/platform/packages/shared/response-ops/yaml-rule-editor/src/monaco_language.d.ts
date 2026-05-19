/**
 * Custom language ID for YAML with embedded ES|QL
 */
export declare const ALERTING_V2_YAML_ESQL_LANG_ID = "alertingV2YamlEsql";
/**
 * Update the ES|QL property names used by the tokenizer.
 * Call this when the editor's esqlPropertyNames prop changes.
 */
export declare const setEsqlPropertyNames: (propertyNames: string[]) => void;
/**
 * Ensure the custom YAML+ES|QL language is registered with Monaco
 */
export declare const ensureAlertingYamlLanguage: () => void;
