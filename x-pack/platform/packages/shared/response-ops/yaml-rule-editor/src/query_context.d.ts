import type { QueryContext } from './types';
/**
 * Find the ES|QL query context at the cursor position.
 * Handles inline queries, block scalar queries (| or >), and multi-line continuation.
 *
 * @param text - The full YAML text
 * @param cursorOffset - The cursor offset in the text
 * @param esqlPropertyNames - Property names that should be treated as ES|QL queries
 * @returns QueryContext if cursor is within a query, null otherwise
 */
export declare const findYamlQueryContext: (text: string, cursorOffset: number, esqlPropertyNames?: string[]) => QueryContext | null;
