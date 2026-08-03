import type { Field, InlineField, RefField } from '../types/domain/template/fields';
import type { FieldDefinition } from '../types/domain/field_definition/latest';
export declare const getFieldSnakeKey: (name: string, type: string) => string;
export declare const getFieldCamelKey: (name: string, type: string) => string;
/**
 * Parses an array of field definitions into resolved inline fields, skipping any
 * definitions that are malformed or describe reference (non-inline) fields.
 */
export declare const parseFieldDefinitionsToInlineFields: (defs: FieldDefinition[]) => InlineField[];
/**
 * Coerces a YAML-parsed default value to a string for use in `extended_fields`.
 * Single source of truth; re-exported from `public/components/templates_v2/utils`.
 */
export declare const getYamlDefaultAsString: (rawDefault: unknown) => string;
/**
 * Applies a `$ref` entry's overrides onto its resolved library (inline) field:
 * - `name` acts as a local alias replacing the library field's name.
 * - `metadata.default` overrides the library default. Three cases:
 *     - absent (`undefined`): inherit the library field's default,
 *     - explicit `null`: clear the inherited default so the field stays empty (this is what the
 *       v1→v2 migration emits for a legacy template field whose value was explicitly cleared),
 *     - any other value: use it as the field's default.
 *
 * Shared by `resolveTemplateFields` (server / case-creation) and `useResolvedFields` (editor) so
 * both paths resolve `$ref` overrides identically.
 */
export declare const applyRefFieldOverride: (inlineField: InlineField, refField: RefField) => InlineField;
/**
 * Resolves a template `fields` array into a flat list of inline fields by:
 * - passing inline fields through as-is,
 * - looking up `$ref` fields by name in `libraryDefs`, parsing their YAML definition,
 *   and applying the ref entry's `name` alias and `metadata.default` override (see
 *   {@link applyRefFieldOverride}).
 *
 * Fields that cannot be resolved or that produce another ref are silently dropped.
 */
export declare const resolveTemplateFields: (definitionFields: readonly Field[], libraryDefs: readonly FieldDefinition[]) => InlineField[];
/**
 * Builds an `extended_fields` map (flat `Record<string, string>`) from a list of
 * resolved inline fields by coercing each field's `metadata.default` to a string.
 */
export declare const buildExtendedFieldsDefaults: (resolvedFields: readonly InlineField[]) => Record<string, string>;
interface LegacyCaseCustomField {
    key: string;
    type: string;
    value: unknown;
}
/**
 * Maps a legacy `customFields` type string to the v2 field-definition `type` string used as the
 * `_as_<type>` suffix in `extended_fields` storage keys.
 *
 * - `'number'` → `'integer'`  (v1 numbers are integer-only; matches the v2 integer field type)
 * - `'toggle'` → `'boolean'`  (matches the native v2 TOGGLE field's `type`)
 * - everything else → `'keyword'`
 *
 * Shared between the one-shot migration and the write-time adapter so that the key each path
 * derives for a given field is always identical.
 */
export declare const getV2FieldType: (legacyType: string) => "integer" | "boolean" | "keyword";
/**
 * Computes the `extended_fields` entries to add to a case from its legacy `customFields`.
 *
 * Semantics — **existing wins, nulls skipped**:
 * - A key already present in `existingExtendedFields` is left as-is (a value set through the v2
 *   system takes precedence over the legacy mirror).
 * - A `customFields` entry whose value is `null` or `undefined` is skipped — the case left the
 *   field empty; the v2 field then renders empty rather than being forced to a value.
 *
 * Returns only the *additions* (keys not yet present). Callers are responsible for spreading the
 * result over the existing map; see {@link mergeCustomFieldsIntoExtendedFields} for the combined
 * helper.
 */
export declare const buildExtendedFieldsBackfill: (customFields: LegacyCaseCustomField[] | undefined, existingExtendedFields: Record<string, unknown> | null | undefined) => Record<string, string>;
/**
 * Mirrors `customFields` values into an existing `extended_fields` map with
 * **customFields-win** semantics — the live write-time counterpart of {@link buildExtendedFieldsBackfill}.
 *
 * Rules applied for each customField entry:
 * - non-null / non-undefined value → override (or add) the mirror key with `String(value)`.
 * - null / undefined value → delete the mirror key so the v2 field renders empty rather than
 *   retaining a stale value.
 *
 * Returns:
 * - `existingExtendedFields` unchanged (same reference) when every key in the result would be
 *   identical to the current map — callers use reference equality to detect a no-op and skip
 *   the SO write.
 * - a new merged map otherwise.
 *
 * Note: the one-shot migration backfill ({@link buildExtendedFieldsBackfill}) retains
 * existing-wins semantics so it never clobbers values written through the v2 system.
 */
export declare const mergeCustomFieldsIntoExtendedFields: (customFields: LegacyCaseCustomField[] | undefined, existingExtendedFields: Record<string, unknown> | null | undefined) => Record<string, string> | null | undefined;
export {};
