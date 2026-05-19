/**
 * ES|QL `LAST(tags, …)` on the alert-actions `tags` field may return a
 * string, a multivalue array, or null. Normalize to a string array for UI.
 */
export declare const normalizeTags: (value: string | string[] | null | undefined) => string[];
