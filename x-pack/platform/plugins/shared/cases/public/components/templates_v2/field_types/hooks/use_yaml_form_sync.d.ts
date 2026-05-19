import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface FieldInfo {
    name: string;
    type: string;
    control: string;
    metadata?: {
        default?: unknown;
        [key: string]: unknown;
    };
}
export type OnFieldDefaultChange = (fieldName: string, value: string, control: string) => void;
export declare const useYamlToFormSync: (form: FormHook, parsedFields: FieldInfo[], syncingFromYamlRef: React.MutableRefObject<boolean>, lastSyncedYamlDefaultRef: React.MutableRefObject<Record<string, string>>) => void;
export declare const useFormToYamlSync: (form: FormHook, parsedFields: FieldInfo[], syncingFromYamlRef: React.MutableRefObject<boolean>, yamlDefaultsRef: React.MutableRefObject<Record<string, string>>, onFieldDefaultChange?: OnFieldDefaultChange) => void;
/**
 * Bidirectional sync between form field values and YAML metadata.default values.
 *
 * - When YAML changes (parsedFields updates), form fields are updated
 * - When form fields change (user input), onFieldDefaultChange callback is called
 * - Prevents feedback loops by tracking synced values
 */
export declare const useYamlFormSync: (form: FormHook, parsedFields: FieldInfo[], onFieldDefaultChange?: OnFieldDefaultChange) => {
    yamlDefaults: Record<string, string>;
};
