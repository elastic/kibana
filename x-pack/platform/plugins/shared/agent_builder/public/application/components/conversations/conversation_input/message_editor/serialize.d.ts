/**
 * Walks child nodes of the editor element and serializes to text.
 * Badge spans are converted to `[/label](scheme://metadataValue)`.
 * Text nodes are appended as-is, with caret-target ZWS characters stripped.
 */
export declare const serializeEditorContent: (editorElement: HTMLElement) => string;
