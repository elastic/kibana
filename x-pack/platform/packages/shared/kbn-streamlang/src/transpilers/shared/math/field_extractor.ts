/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseMathExpression,
  isTinymathVariable,
  isTinymathFunction,
  type TinymathAST,
} from './tinymath_utils';

/**
 * Recursively extracts all field references from a TinyMath AST node.
 *
 * @param node The TinyMath AST node to traverse
 * @param fields Set to collect unique field names
 */
function extractFieldsFromNode(node: TinymathAST, fields: Set<string>): void {
  // Numeric literals have no field references
  if (typeof node === 'number') {
    return;
  }

  // Variables are field references
  if (isTinymathVariable(node)) {
    fields.add(node.value);
    return;
  }

  // Functions: recursively extract from all arguments
  if (isTinymathFunction(node)) {
    for (const arg of node.args) {
      extractFieldsFromNode(arg, fields);
    }
    return;
  }
}

import { BOOLEAN_RETURNING_MATH_FUNCTIONS } from './language_definition';

/**
 * Infers the return type of a math expression based on its root operation.
 *
 * - Comparison functions (eq, neq, lt, lte, gt, gte) return 'boolean'
 * - All other expressions return 'number'
 *
 * @param expression The TinyMath expression string
 * @returns 'boolean' if the expression is a comparison, 'number' otherwise
 *
 * @example
 * inferMathExpressionReturnType('a + b')        // => 'number'
 * inferMathExpressionReturnType('sqrt(x)')      // => 'number'
 * inferMathExpressionReturnType('a > 10')       // => 'boolean'
 * inferMathExpressionReturnType('eq(a, b)')     // => 'boolean'
 * inferMathExpressionReturnType('neq(x, 0)')    // => 'boolean'
 */
export function inferMathExpressionReturnType(expression: string): 'number' | 'boolean' {
  let ast: TinymathAST;
  try {
    ast = parseMathExpression(expression);
  } catch {
    // If parsing fails, default to number
    return 'number';
  }

  // If root node is a comparison function, it returns boolean
  if (isTinymathFunction(ast) && BOOLEAN_RETURNING_MATH_FUNCTIONS.has(ast.name)) {
    return 'boolean';
  }

  return 'number';
}

/**
 * Extracts all field references from a TinyMath expression string.
 *
 * This is used for:
 * 1. Generating `ignore_missing` null checks (IS NOT NULL for each field)
 * 2. Validating that referenced fields exist (optional pre-check)
 * 3. Providing autocomplete/documentation for field usage
 *
 * @param expression The TinyMath expression string
 * @returns Array of unique field names referenced in the expression
 *
 * @example
 * extractFieldsFromMathExpression('price * quantity + tax')
 * // => ['price', 'quantity', 'tax']
 *
 * @example
 * extractFieldsFromMathExpression('abs(attributes.price - attributes.cost)')
 * // => ['attributes.price', 'attributes.cost']
 *
 * @example
 * extractFieldsFromMathExpression('pow(a, 2) + pow(a, 3)')
 * // => ['a'] (deduplicated)
 *
 * @example
 * extractFieldsFromMathExpression('2 * pi() + 10')
 * // => [] (no field references, only constants and literals)
 */
export function extractFieldsFromMathExpression(expression: string): string[] {
  // Parse the expression
  let ast: TinymathAST;
  try {
    ast = parseMathExpression(expression);
  } catch {
    // If parsing fails, return empty array
    // Validation errors will be caught by the validator
    return [];
  }

  // Collect unique field references
  const fields = new Set<string>();
  extractFieldsFromNode(ast, fields);

  // Return as sorted array for consistent ordering
  return Array.from(fields).sort();
}
