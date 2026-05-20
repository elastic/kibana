import type { DissectAST } from '../types';
/**
 * Collapse repeated field sequences in a dissect pattern AST
 *
 * Rules:
 * 1. Middle repeats: If the same field repeats consecutively with the same delimiter
 *    between them AND there's another delimiter after the group, collapse them
 * 2. Trailing repeats: If the tail end has N repetitions of the same field,
 *    collapse all of them regardless of separators
 *
 * @param ast - The Dissect AST to process
 * @returns Modified AST with collapsed repeats
 */
export declare function collapseRepeats(ast: DissectAST): DissectAST;
