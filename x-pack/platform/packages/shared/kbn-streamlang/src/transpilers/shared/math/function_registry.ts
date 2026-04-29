/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Definition for a supported math function in the math processor.
 * Maps TinyMath function names to their ES|QL and Painless equivalents.
 */
export interface FunctionDefinition {
  /** ES|QL function name or operator (e.g., 'LOG', '<', '==') */
  esql: string;
  /** Painless equivalent (e.g., 'Math.log', '<', '==') */
  painless: string;
  /** Number of expected arguments */
  arity: number;
  /**
   * If true, the function is a binary operator (e.g., lt -> <)
   * and should be rendered as infix: `a < b` instead of `LT(a, b)`
   */
  isBinaryOp?: boolean;
}

/**
 * Registry of supported TinyMath functions with mappings to ES|QL and Painless.
 *
 * This registry is the source of truth for:
 * 1. Validation: Only functions in this registry are allowed
 * 2. Transpilation: Maps TinyMath AST to target language syntax
 *
 * Note: The function set is intentionally minimal to ensure compatibility
 * across all transpilation targets (ES|QL, Painless, and future OTTL support).
 *
 * Binary operators (add, subtract, multiply, divide) are handled separately
 * in the transpilers as they are the core TinyMath operators.
 */
export const FUNCTION_REGISTRY: Record<string, FunctionDefinition> = {
  // Logarithmic function - natural log only
  log: { esql: 'LOG', painless: 'Math.log', arity: 1 },

  // Comparison operators (return boolean)
  // Note: TinyMath natively supports lt, gt, eq, lte, gte but NOT neq
  // We add neq as a custom function that transpiles to != in both targets
  lt: { esql: '<', painless: '<', arity: 2, isBinaryOp: true },
  gt: { esql: '>', painless: '>', arity: 2, isBinaryOp: true },
  eq: { esql: '==', painless: '==', arity: 2, isBinaryOp: true },
  neq: { esql: '!=', painless: '!=', arity: 2, isBinaryOp: true },
  lte: { esql: '<=', painless: '<=', arity: 2, isBinaryOp: true },
  gte: { esql: '>=', painless: '>=', arity: 2, isBinaryOp: true },
};

/**
 * Core binary operators that TinyMath represents as functions.
 * These are handled separately in the transpiler for efficiency.
 */
export const BINARY_ARITHMETIC_OPERATORS = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
} as const;

/**
 * Map of rejected TinyMath functions with helpful suggestions.
 * These are valid TinyMath functions but are not supported in the math processor
 * to ensure compatibility across all transpilation targets (OTTL is the limiting factor).
 */
export const REJECTED_FUNCTIONS: Record<string, string> = {
  // Mathematical functions - not supported by OTTL
  abs: 'Function is not supported. Use conditional logic instead: for absolute value, use gt(x, 0) with appropriate branching.',
  sqrt: 'Function is not supported. Square root operations are not available.',
  cbrt: 'Function is not supported. Cube root operations are not available.',
  ceil: 'Function is not supported. Rounding operations are not available.',
  floor: 'Function is not supported. Rounding operations are not available.',
  round: 'Function is not supported. Rounding operations are not available.',
  exp: 'Function is not supported. Exponential operations are not available.',
  signum: 'Function is not supported. Use comparison functions (gt, lt, eq) instead.',
  pow: 'Function is not supported. Power/exponentiation operations are not available.',
  hypot: 'Function is not supported. Hypotenuse calculation is not available.',
  mod: 'Function is not supported. Modulo operations are not available.',

  // Trigonometric functions - not supported by OTTL
  sin: 'Trigonometric functions are not supported.',
  cos: 'Trigonometric functions are not supported.',
  tan: 'Trigonometric functions are not supported.',
  asin: 'Trigonometric functions are not supported.',
  acos: 'Trigonometric functions are not supported.',
  atan: 'Trigonometric functions are not supported.',
  atan_two: 'Trigonometric functions are not supported.',
  sinh: 'Hyperbolic functions are not supported.',
  cosh: 'Hyperbolic functions are not supported.',
  tanh: 'Hyperbolic functions are not supported.',

  // Logarithmic variants - only natural log is supported
  log_ten: 'Only natural logarithm (log) is supported. Base-10 logarithm is not available.',

  // Constants - not supported by OTTL
  pi: 'Mathematical constants are not supported. Use the literal value 3.14159265359 instead.',
  e: "Mathematical constants are not supported. Use the literal value 2.71828182846 (Euler's number) instead.",
  tau: 'Mathematical constants are not supported. Use the literal value 6.28318530718 instead.',

  // Array-oriented functions (no ES|QL equivalent for multi-value)
  count: 'Array operations are not supported. This processor works on single values.',
  size: 'Array operations are not supported. This processor works on single values.',
  first: 'Array operations are not supported. This processor works on single values.',
  last: 'Array operations are not supported. This processor works on single values.',
  unique: 'Array operations are not supported. This processor works on single values.',

  // Statistical aggregation functions
  mean: "Statistical aggregation is not supported. Use 'add(a, b) / 2' for averaging two values.",
  median: 'Statistical aggregation is not supported.',
  mode: 'Statistical aggregation is not supported.',
  sum: "Aggregation is not supported. Use 'add(a, b)' for adding two values.",
  range: 'Statistical aggregation is not supported.',
  max: 'Multi-value aggregation is not supported.',
  min: 'Multi-value aggregation is not supported.',

  // Functions with no workarounds
  square: 'Function is not supported. Multiplication (a * a) can be used instead.',
  cube: 'Function is not supported. Multiplication (a * a * a) can be used instead.',
  fix: 'Function is not supported. Rounding operations are not available.',
  degtorad: 'Function is not supported. Trigonometric operations are not available.',
  radtodeg: 'Function is not supported. Trigonometric operations are not available.',
  clamp: 'Function is not supported.',
  defaults: 'Function is not supported. Use the processor-level ignore_missing option instead.',

  // Non-deterministic
  random: 'Non-deterministic functions are not supported as behavior differs between targets.',
};

/**
 * Helper to check if a function name is a supported function
 */
export function isSupportedFunction(name: string): boolean {
  return name in FUNCTION_REGISTRY || name in BINARY_ARITHMETIC_OPERATORS;
}

/**
 * Helper to check if a function name is a rejected function
 */
export function isRejectedFunction(name: string): boolean {
  return name in REJECTED_FUNCTIONS;
}

/**
 * Get the function definition from the registry
 */
export function getFunctionDefinition(name: string): FunctionDefinition | undefined {
  return FUNCTION_REGISTRY[name];
}

/**
 * Get the rejection reason for a function
 */
export function getRejectionReason(name: string): string | undefined {
  return REJECTED_FUNCTIONS[name];
}

/**
 * Validate that a function's arity matches the expected count
 */
export function validateArity(name: string, argCount: number): { valid: boolean; error?: string } {
  const def = FUNCTION_REGISTRY[name];
  if (!def) {
    // Check if it's a binary arithmetic operator
    if (name in BINARY_ARITHMETIC_OPERATORS) {
      if (argCount !== 2) {
        return {
          valid: false,
          error: `Function '${name}' requires exactly 2 arguments, got ${argCount}.`,
        };
      }
      return { valid: true };
    }
    return { valid: false, error: `Unknown function '${name}'.` };
  }

  const { arity } = def;

  if (argCount !== arity) {
    return {
      valid: false,
      error: `Function '${name}' requires exactly ${arity} argument${
        arity !== 1 ? 's' : ''
      }, got ${argCount}.`,
    };
  }

  return { valid: true };
}
