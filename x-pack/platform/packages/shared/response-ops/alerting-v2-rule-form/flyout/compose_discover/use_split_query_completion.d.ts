import { monaco } from '@kbn/code-editor';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
interface UseSplitQueryCompletionParams {
    /**
     * The base query whose output columns provide the autocomplete context.
     * e.g. "FROM logs-* | STATS cpu = AVG(cpu) BY host.name"
     * The block editor shows only the appended fragment (e.g. "| WHERE cpu > 0.8"),
     * but autocomplete needs to see both.
     */
    baseQuery: string;
    search: DataPublicPluginStart['search']['search'];
}
/**
 * Registers a per-editor Monaco completion provider that understands split ES|QL queries.
 *
 * Technique: at suggestion time, prepend `baseQuery + ' '` to the editor's text to form
 * a syntactically complete ES|QL query, adjust the cursor offset, and call `suggest()`.
 * This makes column names from the base query available for autocomplete in the block editor.
 *
 * Usage:
 *   const { onEditorMount } = useSplitQueryCompletion({ baseQuery, search });
 *   <CodeEditor editorDidMount={onEditorMount} ... />
 *
 * Swap strategy: replace this hook with a different implementation if ES|QL ever adds a
 * native "query context" parameter to its autocomplete API.
 */
export declare function useSplitQueryCompletion({ baseQuery, search }: UseSplitQueryCompletionParams): {
    onEditorMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
};
export {};
