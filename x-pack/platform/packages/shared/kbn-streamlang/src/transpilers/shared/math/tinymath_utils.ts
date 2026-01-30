/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared TinyMath utilities and type guards.
 * Centralizes TinyMath dependency to avoid duplication across transpilers.
 */

// Re-export TinyMath types and parse function
export { parse as parseMathExpression } from '@kbn/tinymath';
export type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';

import type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';

/**
 * Type guard: checks if a TinyMath node is a variable (field reference)
 */
export function isTinymathVariable(node: TinymathAST): node is TinymathVariable {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'variable';
}

/**
 * Type guard: checks if a TinyMath node is a function
 */
export function isTinymathFunction(node: TinymathAST): node is TinymathFunction {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'function';
}

/**
 * Type guard: checks if a TinyMath node is a numeric literal
 */
export function isTinymathLiteral(node: TinymathAST): node is number {
  return typeof node === 'number';
}
