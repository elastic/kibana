import type { DelimiterNode, DissectField, DissectAST } from './types';
/**
 * Generate a Dissect AST from delimiters and fields
 *
 * Algorithm:
 * 1. Interleave delimiters and fields in order
 * 2. Create appropriate AST nodes with modifiers
 * 3. Handle edge cases (no delimiters, fields before first delimiter)
 *
 * @param delimiterTree - Array of delimiter nodes
 * @param fields - Array of dissect fields
 * @returns DissectAST
 */
export declare function generateAST(delimiterTree: DelimiterNode[], fields: DissectField[]): DissectAST;
