/**
 * The document root's inline field (one with a `control`), or `null` when the buffer is empty, the
 * root is not a map, or the map has no `control`. Error-bearing buffers also resolve to `null` — the
 * menu branches that would mutate them are disabled instead (see hasTemplateParseErrors).
 */
export declare const getRootFieldControl: (yaml: string) => {
    control: string;
    name?: string;
} | null;
export interface ReplaceRootFieldResult {
    yaml: string;
    /** Why the replace did not apply, when the yaml is returned unchanged. */
    status: 'applied' | 'invalid';
}
/**
 * Replaces the entire document root with a fresh field scaffold. Whether this creates the first
 * field or changes an existing field's type is purely a labeling distinction in the menu — the
 * operation is the same whole-root swap, and nothing from the prior definition survives (so a stale
 * `default`/`validation` of the wrong shape can never outlive a type change).
 */
export declare const replaceRootField: (yaml: string, fieldObject: Record<string, unknown>) => ReplaceRootFieldResult;
export type ApplyRootFieldBlockStatus = 'applied' | 'no-field' | 'exists' | 'invalid';
export interface ApplyRootFieldBlockResult {
    yaml: string;
    status: ApplyRootFieldBlockStatus;
}
/**
 * Adds a single rule under the root field's `validation` or `display` block (creating the block if
 * needed). Mirrors applyFieldBlock's contract minus the cursor targeting. Returns:
 *  - `invalid`  — the buffer has YAML errors and can't be re-serialized; nothing changed.
 *  - `no-field` — the root is not an inline (control) field; nothing changed.
 *  - `exists`   — that rule key is already present; left untouched so authored values are never
 *                 clobbered.
 *  - `applied`  — the rule was added with the supplied scaffold value.
 */
export declare const applyRootFieldBlock: (yaml: string, blockKey: "validation" | "display", ruleKey: string, ruleValue: unknown) => ApplyRootFieldBlockResult;
