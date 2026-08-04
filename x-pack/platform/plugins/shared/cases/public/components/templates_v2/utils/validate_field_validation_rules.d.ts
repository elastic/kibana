import type { Document } from 'yaml';
import type { EditorMarker } from './template_yaml_ast';
/**
 * Type-specific validation rules — the ones that only take effect on certain controls. The
 * always-applicable rules (`required`, `required_on_close`, `required_when`, `pattern`) are
 * deliberately not listed: they are valid on every input, so they are never flagged. In
 * particular `pattern` is enforced at runtime for every inline control (validateExtendedFields
 * calls `validatePattern` unconditionally, before the per-control branch), so flagging it as
 * text-only here would wrongly tell an author to remove a constraint that actually works.
 */
declare const TYPE_SPECIFIC_RULES: readonly ["min", "max", "min_length", "max_length"];
type TypeSpecificRule = (typeof TYPE_SPECIFIC_RULES)[number];
/**
 * The type-specific rules that actually take effect for a given control, mirroring the
 * "Validation by field type" reference: text controls honor `pattern`/length rules, number
 * controls honor `min`/`max`, and every other control honors none of them.
 */
export declare const getApplicableTypeSpecificRules: (control: string) => readonly TypeSpecificRule[];
/**
 * Flags validation rules that have no effect on a field's control type — e.g. `min_length` on a
 * Number or `min` on a Text field. Today these are silently ignored (a documented gotcha), so an
 * author can believe a constraint is enforced when it is not. We surface each as a warning on the
 * offending rule key so the mistake is visible in the editor.
 */
export declare const getInapplicableValidationRuleMarkers: (yamlContent: string, preparsedDoc?: Document.Parsed) => EditorMarker[];
export {};
