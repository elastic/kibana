/**
 * Shared TinyMath utilities and type guards.
 * Centralizes TinyMath dependency to avoid duplication across transpilers.
 */
export { parse as parseMathExpression } from '@kbn/tinymath';
export type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';
/**
 * Type guard: checks if a TinyMath node is a variable (field reference)
 */
export declare function isTinymathVariable(node: TinymathAST): node is TinymathVariable;
/**
 * Type guard: checks if a TinyMath node is a function
 */
export declare function isTinymathFunction(node: TinymathAST): node is TinymathFunction;
/**
 * Type guard: checks if a TinyMath node is a numeric literal
 */
export declare function isTinymathLiteral(node: TinymathAST): node is number;
