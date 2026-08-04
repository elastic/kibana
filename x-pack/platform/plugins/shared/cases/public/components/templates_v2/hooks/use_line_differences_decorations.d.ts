import { monaco } from '@kbn/code-editor';
interface UseLineDifferencesDecorationsProps {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    savedValue?: string;
    currentValue: string;
}
/**
 * Uses the `diff` library's LCS-based `diffLines` to determine which lines in
 * `current` were added or modified relative to `original`.
 * Returns 1-based line numbers.
 */
export declare const computeChangedLines: (original: string, current: string) => number[];
/**
 * Highlights lines in the editor gutter that differ from the last saved value.
 */
export declare const useLineDifferencesDecorations: ({ editor, savedValue, currentValue, }: UseLineDifferencesDecorationsProps) => void;
export {};
