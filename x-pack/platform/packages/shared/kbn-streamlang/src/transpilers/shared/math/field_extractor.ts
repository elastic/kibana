/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';

/**
 * Checks if a TinyMath node is a variable (field reference)
 */
function isTinymathVariable(node: TinymathAST): node is TinymathVariable {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'variable';
}

/**
 * Checks if a TinyMath node is a function
 */
function isTinymathFunction(node: TinymathAST): node is TinymathFunction {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'function';
}

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
 * extractFieldReferences('price * quantity + tax')
 * // => ['price', 'quantity', 'tax']
 *
 * @example
 * extractFieldReferences('abs(attributes.price - attributes.cost)')
 * // => ['attributes.price', 'attributes.cost']
 *
 * @example
 * extractFieldReferences('pow(a, 2) + pow(a, 3)')
 * // => ['a'] (deduplicated)
 *
 * @example
 * extractFieldReferences('2 * pi() + 10')
 * // => [] (no field references, only constants and literals)
 */
export function extractFieldReferencesFromMathExpression(expression: string): string[] {
  // Parse the expression
  let ast: TinymathAST;
  try {
    ast = parse(expression);
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
