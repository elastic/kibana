import type { Document, Node, Scalar, YAMLMap } from 'yaml';
/**
 * A validation marker in Monaco's 1-based line/column coordinate space, kept free of any Monaco
 * types so the semantic validators can be unit tested without the editor. The consuming hook maps
 * `severity` onto `monaco.MarkerSeverity`.
 */
export interface EditorMarker {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    severity: 'error' | 'warning';
}
/**
 * Parses the template YAML into a document whose root is a mapping, or returns `null` when the
 * content is empty, malformed, or not a top-level object. Semantic validators bail out on `null`
 * so they never fight monaco-yaml's own syntax/schema diagnostics on broken YAML.
 */
export declare const parseTemplateDocument: (yamlContent: string) => Document.Parsed | null;
/** Returns the `fields` sequence entries as mapping nodes, or an empty array when absent. */
export declare const getFieldItemMaps: (doc: Document.Parsed) => YAMLMap[];
/**
 * The effective, unique-within-template name of a field entry: for a `$ref` it is the local
 * `name` alias when present, otherwise the referenced library name; for an inline field it is
 * `name`. Mirrors `getEffectiveName` in the field-library link utilities.
 */
export declare const getEffectiveFieldName: (field: YAMLMap) => string | undefined;
/** The set of every effective field name declared in the template's `fields` list. */
export declare const getDefinedFieldNames: (fieldItems: YAMLMap[]) => Set<string>;
/**
 * Builds a fast offset → 1-based {lineNumber, column} resolver for a source string, precomputing
 * line-start offsets once so each lookup is a binary search.
 */
export declare const createOffsetToPosition: (source: string) => (offset: number) => {
    lineNumber: number;
    column: number;
};
/**
 * Converts a YAML node's source range into a Monaco marker rectangle using the supplied resolver,
 * or `null` when the node carries no range (e.g. a node created in memory).
 */
export declare const nodeRangeToMarkerPosition: (node: Node | Scalar, toPosition: ReturnType<typeof createOffsetToPosition>) => Pick<EditorMarker, "startLineNumber" | "startColumn" | "endLineNumber" | "endColumn"> | null;
