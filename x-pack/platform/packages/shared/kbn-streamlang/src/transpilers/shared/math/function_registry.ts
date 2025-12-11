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
  /** ES|QL function name or operator (e.g., 'ABS', '+', '%') */
  esql: string;
  /** Painless equivalent (e.g., 'Math.abs', '+', '%') */
  painless: string;
  /**
   * Number of expected arguments:
   * - number: exact count required
   * - [min, max]: range of allowed arguments
   */
  arity: number | [number, number];
  /**
   * If true, the function is a binary operator (e.g., mod -> %, lt -> <)
   * and should be rendered as infix: `a % b` instead of `MOD(a, b)`
   */
  isBinaryOp?: boolean;
  /**
   * Argument transformation for ES|QL:
   * - 'swap': Swap argument order (for log(value, base) -> LOG(base, value))
   */
  esqlArgOrder?: 'swap';
  /**
   * If true, this is a constant (0-arity function like pi())
   */
  isConstant?: boolean;
}

/**
 * Registry of supported TinyMath functions with mappings to ES|QL and Painless.
 *
 * This registry is the source of truth for:
 * 1. Validation: Only functions in this registry are allowed
 * 2. Transpilation: Maps TinyMath AST to target language syntax
 *
 * NAMING: TinyMath grammar allows [a-zA-Z_-]+ for function names (no digits).
 * For ES|QL functions with digits (like LOG10), we use underscore naming:
 * - log_ten → LOG10, atan_two → ATAN2
 *
 * Binary operators (add, subtract, multiply, divide) are handled separately
 * in the transpilers as they are the core TinyMath operators.
 */
export const FUNCTION_REGISTRY: Record<string, FunctionDefinition> = {
  // Single-argument math functions
  abs: { esql: 'ABS', painless: 'Math.abs', arity: 1 },
  sqrt: { esql: 'SQRT', painless: 'Math.sqrt', arity: 1 },
  cbrt: { esql: 'CBRT', painless: 'Math.cbrt', arity: 1 },
  ceil: { esql: 'CEIL', painless: 'Math.ceil', arity: 1 },
  floor: { esql: 'FLOOR', painless: 'Math.floor', arity: 1 },
  exp: { esql: 'EXP', painless: 'Math.exp', arity: 1 },
  signum: { esql: 'SIGNUM', painless: 'Math.signum', arity: 1 },

  // Trigonometric functions
  sin: { esql: 'SIN', painless: 'Math.sin', arity: 1 },
  cos: { esql: 'COS', painless: 'Math.cos', arity: 1 },
  tan: { esql: 'TAN', painless: 'Math.tan', arity: 1 },

  // Inverse trigonometric functions
  asin: { esql: 'ASIN', painless: 'Math.asin', arity: 1 },
  acos: { esql: 'ACOS', painless: 'Math.acos', arity: 1 },
  atan: { esql: 'ATAN', painless: 'Math.atan', arity: 1 },
  atan_two: { esql: 'ATAN2', painless: 'Math.atan2', arity: 2 }, // atan2(y, x)

  // Hyperbolic functions
  sinh: { esql: 'SINH', painless: 'Math.sinh', arity: 1 },
  cosh: { esql: 'COSH', painless: 'Math.cosh', arity: 1 },
  tanh: { esql: 'TANH', painless: 'Math.tanh', arity: 1 },

  // Logarithmic functions
  log: { esql: 'LOG', painless: 'Math.log', arity: [1, 2], esqlArgOrder: 'swap' },
  log_ten: { esql: 'LOG10', painless: 'Math.log10', arity: 1 },

  // Variable-arity functions
  round: { esql: 'ROUND', painless: 'Math.round', arity: [1, 2] },

  // Two-argument functions
  pow: { esql: 'POW', painless: 'Math.pow', arity: 2 },
  hypot: { esql: 'HYPOT', painless: 'Math.hypot', arity: 2 }, // sqrt(x^2 + y^2)

  // Binary operators (rendered as infix: a op b)
  mod: { esql: '%', painless: '%', arity: 2, isBinaryOp: true },

  // Comparison operators (return boolean)
  // Note: TinyMath natively supports lt, gt, eq, lte, gte but NOT neq
  // We add neq as a custom function that transpiles to != in both targets
  lt: { esql: '<', painless: '<', arity: 2, isBinaryOp: true },
  gt: { esql: '>', painless: '>', arity: 2, isBinaryOp: true },
  eq: { esql: '==', painless: '==', arity: 2, isBinaryOp: true },
  neq: { esql: '!=', painless: '!=', arity: 2, isBinaryOp: true },
  lte: { esql: '<=', painless: '<=', arity: 2, isBinaryOp: true },
  gte: { esql: '>=', painless: '>=', arity: 2, isBinaryOp: true },

  // Constants (0-arity functions)
  pi: { esql: 'PI', painless: 'Math.PI', arity: 0, isConstant: true },
  e: { esql: 'E', painless: 'Math.E', arity: 0, isConstant: true },
  tau: { esql: 'TAU', painless: '(2 * Math.PI)', arity: 0, isConstant: true },
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
 * because they have no ES|QL equivalent or are array-oriented.
 */
export const REJECTED_FUNCTIONS: Record<string, string> = {
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
  max: "Multi-value aggregation is not supported. For two values, use 'ifelse(gt(a, b), a, b)'.",
  min: "Multi-value aggregation is not supported. For two values, use 'ifelse(lt(a, b), a, b)'.",

  // Functions with workarounds
  square: "Use 'pow(a, 2)' instead.",
  cube: "Use 'pow(a, 3)' instead.",
  fix: "Use 'floor(a)' for positive numbers or 'ceil(a)' for negative numbers.",
  degtorad: "Use 'a * pi() / 180' instead.",
  radtodeg: "Use 'a * 180 / pi()' instead.",
  clamp:
    "No direct ES|QL equivalent. Use 'ifelse(lt(a, min), min, ifelse(gt(a, max), max, a))' instead.",
  defaults: 'No ES|QL equivalent. Use the processor-level ignore_missing option instead.',

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

  if (typeof arity === 'number') {
    if (argCount !== arity) {
      return {
        valid: false,
        error: `Function '${name}' requires exactly ${arity} argument${
          arity !== 1 ? 's' : ''
        }, got ${argCount}.`,
      };
    }
  } else {
    const [min, max] = arity;
    if (argCount < min || argCount > max) {
      return {
        valid: false,
        error: `Function '${name}' requires ${min} to ${max} arguments, got ${argCount}.`,
      };
    }
  }

  return { valid: true };
}
