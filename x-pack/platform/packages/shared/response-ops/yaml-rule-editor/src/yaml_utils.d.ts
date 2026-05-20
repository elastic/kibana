import { monaco } from '@kbn/monaco';
import YAML, { LineCounter } from 'yaml';
import type { CompletionContext } from './types';
/**
 * Get existing keys from YAML text at a given indent level
 */
export declare const getExistingYamlKeys: (text: string, parentPath: string[]) => Set<string>;
/**
 * Get completion context for YAML editing at a given position
 */
export declare const getCompletionContext: (text: string, position: monaco.Position) => CompletionContext | null;
/**
 * Find a YAML node for a given path in a parsed YAML document
 */
export declare const findYamlNodeForPath: (doc: YAML.Document, path: Array<string | number>) => {
    node: YAML.Node | null;
    pair: YAML.Pair<YAML.Node, YAML.Node> | null;
};
/**
 * Convert YAML line position to Monaco position
 */
export declare const toMonacoPosition: (linePos: {
    line: number;
    col: number;
}) => {
    lineNumber: number;
    column: number;
};
/**
 * Get Monaco range from YAML offsets
 */
export declare const getRangeFromOffsets: (lineCounter: LineCounter, start: number, end: number) => monaco.Range;
/**
 * Build validation markers for YAML content in Monaco editor
 */
export declare const buildYamlValidationMarkers: (model: monaco.editor.ITextModel) => void;
/**
 * Get the YAML path at a given position in the text
 *
 * @param text - The full YAML text
 * @param position - The Monaco position
 * @param esqlPropertyNames - Property names that should be treated as ES|QL queries
 */
export declare const getYamlPathAtPosition: (text: string, position: monaco.Position, esqlPropertyNames?: string[]) => string[] | null;
