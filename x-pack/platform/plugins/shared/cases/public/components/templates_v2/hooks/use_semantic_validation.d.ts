import { monaco } from '@kbn/monaco';
/**
 * Registers editor markers for the semantic checks that a JSON Schema cannot express: conditions
 * that reference a non-existent field, and validation rules applied to a control type they do not
 * affect. Both are documented gotchas that otherwise fail silently. Debounced like the sibling
 * field-name/user-picker validators so it does not run on every keystroke, and scoped to its own
 * marker owner so it never clobbers monaco-yaml's diagnostics.
 */
export declare const useSemanticValidation: (editor: monaco.editor.IStandaloneCodeEditor | null, value: string) => void;
