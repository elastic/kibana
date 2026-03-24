/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FUNCTION_REGISTRY,
  BINARY_ARITHMETIC_OPERATORS,
  REJECTED_FUNCTIONS,
  validateArity,
} from './function_registry';
import {
  parseMathExpression,
  isTinymathVariable,
  isTinymathFunction,
  type TinymathAST,
} from './tinymath_utils';

/**
 * Result of validating a math expression
 */
export interface ValidationResult {
  /** Whether the expression is valid */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: string[];
}

/**
 * Recursively validates a TinyMath AST node, collecting all errors.
 *
 * @param node The TinyMath AST node to validate
 * @param errors Array to collect validation errors
 */
function validateNode(node: TinymathAST, errors: string[]): void {
  // Numeric literals are always valid
  if (typeof node === 'number') {
    return;
  }

  // Variables (field references) are always valid
  if (isTinymathVariable(node)) {
    return;
  }

  // Validate function calls
  if (isTinymathFunction(node)) {
    const { name, args } = node;

    // Check if this is a rejected function with a helpful suggestion
    if (name in REJECTED_FUNCTIONS) {
      const suggestion = REJECTED_FUNCTIONS[name];
      errors.push(`Function '${name}' is not supported. ${suggestion}`);
      // Still validate children to catch all errors
      for (const arg of args) {
        validateNode(arg, errors);
      }
      return;
    }

    // Check if this is a supported function or binary operator
    const isInRegistry = name in FUNCTION_REGISTRY;
    const isBinaryOp = name in BINARY_ARITHMETIC_OPERATORS;

    if (!isInRegistry && !isBinaryOp) {
      errors.push(
        `Unknown function '${name}'. Check spelling or see documentation for supported functions.`
      );
      // Still validate children
      for (const arg of args) {
        validateNode(arg, errors);
      }
      return;
    }

    // Validate arity (argument count)
    const arityResult = validateArity(name, args.length);
    if (!arityResult.valid && arityResult.error) {
      errors.push(arityResult.error);
    }

    // Recursively validate all arguments
    for (const arg of args) {
      validateNode(arg, errors);
    }
    return;
  }

  // Unknown node type (shouldn't happen with valid TinyMath AST)
  errors.push(`Unexpected expression type in math expression.`);
}

/**
 * Validates a TinyMath expression string against the allowed function registry.
 *
 * This function:
 * 1. Parses the expression into a TinyMath AST
 * 2. Recursively walks the AST to validate all function calls
 * 3. Returns validation result with any errors found
 *
 * @param expression The TinyMath expression string to validate
 * @returns ValidationResult with valid flag and any error messages
 *
 * @example
 * // Valid expression
 * validateMathExpression('abs(price - 10) * 2')
 * // => { valid: true, errors: [] }
 *
 * @example
 * // Invalid expression with rejected function
 * validateMathExpression('mean(a, b, c)')
 * // => { valid: false, errors: ["Function 'mean' is not supported. ..."] }
 */
export function validateMathExpression(expression: string): ValidationResult {
  const errors: string[] = [];

  // Parse the expression
  let ast: TinymathAST;
  try {
    ast = parseMathExpression(expression);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    return {
      valid: false,
      errors: [message],
    };
  }

  // Validate the AST
  validateNode(ast, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a list of all supported function names for documentation/autocomplete
 */
export function getSupportedFunctionNames(): string[] {
  const registryFunctions = Object.keys(FUNCTION_REGISTRY);
  const binaryOps = Object.keys(BINARY_ARITHMETIC_OPERATORS);
  return [...registryFunctions, ...binaryOps].sort();
}
