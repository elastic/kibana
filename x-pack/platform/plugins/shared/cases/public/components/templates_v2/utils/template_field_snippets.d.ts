/**
 * A yaml-language-server `defaultSnippets` entry: a labeled, ready-to-edit template that the editor
 * offers as a completion. `body` is serialized to YAML with `${n:placeholder}` tab stops the author
 * tabs through. See jsonSchema.d.ts in yaml-language-server.
 */
export interface DefaultSnippet {
    label: string;
    description?: string;
    body: unknown;
}
/**
 * One snippet per inline field control. Each body mirrors the minimal, valid shape from the field
 * catalog (correct `control`, `type`, and the required `metadata` for that control), so choosing a
 * field type from autocomplete scaffolds a correct entry without the author needing to recall the
 * exact keys from the documentation. Shared by the template editor (as `fields` array entries) and
 * the field library editor (as the document root) — `$ref` is template-only, see
 * FIELD_DEFAULT_SNIPPETS.
 */
export declare const INLINE_FIELD_DEFAULT_SNIPPETS: DefaultSnippet[];
/**
 * Snippets for a template's `fields` array entries: every inline control plus a `$ref` library
 * reference (references only make sense inside a template, never in the library itself).
 */
export declare const FIELD_DEFAULT_SNIPPETS: DefaultSnippet[];
/** A single assignee entry (`- uid: ...`) offered when adding to the `assignees` list. */
export declare const ASSIGNEE_DEFAULT_SNIPPETS: DefaultSnippet[];
