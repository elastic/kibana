/**
 * Turns snippet tab-stop values (`${1:field_name}`) into their bare placeholder text (`field_name`).
 * Non-placeholder scalars, booleans, and numbers pass through unchanged; arrays/objects recurse.
 */
export declare const stripSnippetPlaceholders: (value: unknown) => unknown;
/**
 * A fresh, ready-to-insert scaffold object for a field control (e.g. INPUT_TEXT), or `null` for an
 * unknown control. A deep clone is returned so callers can safely mutate (e.g. uniquify the name).
 */
export declare const buildFieldScaffold: (control: string) => Record<string, unknown> | null;
/**
 * The inline field entry (one with a `control`) the cursor sits on, or `null`. Drives whether the
 * Validation / Conditional-logic menu branches are enabled and which rules they offer.
 */
export declare const getFieldControlAtLine: (yaml: string, line: number | undefined) => {
    control: string;
    name?: string;
} | null;
/**
 * True when the buffer parses but carries YAML errors (e.g. a tab used for indentation, an unclosed
 * flow collection). `doc.toString()` throws on such a document, so the mutation helpers below no-op
 * on it and the menu disables its mutating branches rather than silently failing. Empty buffers are
 * NOT errors — they are a valid starting point for the first inserted field.
 */
export declare const hasTemplateParseErrors: (yaml: string) => boolean;
export interface InsertFieldResult {
    yaml: string;
    changed: boolean;
    /** Why an insert did not apply, when `changed` is false. */
    reason?: 'exists' | 'invalid';
    /** The effective name of the inserted entry (after uniquification), for cursor placement. */
    insertedName?: string;
}
/**
 * Inserts a field entry (an inline scaffold or a `{ $ref }` reference) into the template's `fields`
 * list. When the cursor sits inside an existing field entry the new entry is placed directly after
 * it; otherwise it is appended to the end of `fields` (everything above `fields` is case data). A
 * missing `fields` block is created.
 *
 * Inline entries get a unique `name` (a numeric suffix is appended on collision) so a fresh insert
 * never immediately trips the duplicate-name validator. A `$ref` that is already linked is a no-op
 * (`changed: false`) — the caller surfaces that to the user rather than adding a duplicate.
 */
export declare const insertTemplateField: (yaml: string, fieldObject: Record<string, unknown>, cursorLine?: number) => InsertFieldResult;
export type ApplyFieldBlockStatus = 'applied' | 'no-field' | 'exists' | 'invalid';
export interface ApplyFieldBlockResult {
    yaml: string;
    status: ApplyFieldBlockStatus;
    fieldName?: string;
}
/**
 * Adds a single rule under a field's `validation` or `display` block (creating the block if needed),
 * targeting the inline field the cursor is on. Returns:
 *  - `invalid`    — the buffer has YAML errors and can't be re-serialized; nothing changed.
 *  - `no-field`   — the cursor is not on an inline (control) field; nothing changed.
 *  - `exists`     — that rule key is already present; left untouched so authored values are never
 *                   clobbered.
 *  - `applied`    — the rule was added with the supplied scaffold value.
 */
export declare const applyFieldBlock: (yaml: string, cursorLine: number | undefined, blockKey: "validation" | "display", ruleKey: string, ruleValue: unknown) => ApplyFieldBlockResult;
