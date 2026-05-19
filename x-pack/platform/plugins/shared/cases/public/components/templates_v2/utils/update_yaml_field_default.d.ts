import type { z } from '@kbn/zod/v4';
import type { UserPickerDefaultSchema } from '../../../../common/types/domain/template/fields';
export type FieldDefaultValue = string | number | string[] | z.infer<typeof UserPickerDefaultSchema>;
/**
 * Updates or adds `metadata.default` for a specific field in the YAML definition.
 * Uses the `yaml` library's parseDocument to preserve comments and formatting.
 */
export declare const updateYamlFieldDefault: (yaml: string, fieldName: string, newValue: FieldDefaultValue) => string;
/**
 * Removes `metadata.default` for a specific field in the YAML definition.
 * Uses the `yaml` library's parseDocument to preserve comments and formatting.
 * If metadata becomes empty after removal, the entire metadata key is also removed.
 */
export declare const removeYamlFieldDefault: (yaml: string, fieldName: string) => string;
/**
 * Updates or adds `metadata.default` directly in a single field definition YAML.
 * Unlike updateYamlFieldDefault, operates on the root level (no `fields` array wrapper).
 */
export declare const updateFieldDefinitionDefault: (yaml: string, newValue: FieldDefaultValue) => string;
/**
 * Removes `metadata.default` from a single field definition YAML.
 * Unlike removeYamlFieldDefault, operates on the root level (no `fields` array wrapper).
 */
export declare const removeFieldDefinitionDefault: (yaml: string) => string;
/**
 * Checks if a field has metadata.default defined in the YAML.
 */
export declare const hasFieldDefault: (yaml: string, fieldName: string) => boolean;
