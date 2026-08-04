import type { Document } from 'yaml';
import type { EditorMarker } from './template_yaml_ast';
/**
 * Flags `display.show_when` / `validation.required_when` rules that reference a field name which
 * does not exist in the template. This is the documented gotcha where a typo'd `field` raises no
 * error and the rule silently evaluates to `true` — making a field always visible or always
 * required (see `evaluateCondition`). Surfacing it as a warning lets an author catch the typo in
 * the editor instead of discovering the misbehavior on a live case.
 */
export declare const getMissingConditionFieldMarkers: (yamlContent: string, preparsedDoc?: Document.Parsed) => EditorMarker[];
