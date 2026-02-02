/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Streams Math Expression Language Definition
 *
 * This file is the single source of truth for the math expression language.
 * It defines all functions, operators, and their metadata used for:
 * - Documentation
 * - Autocomplete
 * - Syntax highlighting
 * - Validation
 * - Type inference
 *
 * Note: The function set is intentionally minimal to ensure compatibility
 * across all transpilation targets (ES|QL, Painless, and future OTTL support).
 */

export type MathFunctionCategory = 'logarithmic' | 'comparison';

export interface MathFunctionArg {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface MathFunctionDefinition {
  /** Function name (e.g., 'log', 'eq') */
  name: string;
  /** Function signature for display (e.g., 'log(value)') */
  signature: string;
  /** i18n description for documentation and autocomplete */
  description: string;
  /** Typed arguments - used for docs and to derive parameter names for signature help */
  args: MathFunctionArg[];
  /** Category for grouping */
  category: MathFunctionCategory;
  /** Whether this function returns a boolean */
  returnsBoolean?: boolean;
  /** Example usage for documentation */
  example: string;
}

export interface OperatorDefinition {
  /** Operator symbol */
  symbol: string;
  /** Description */
  description: string;
  /** Whether this is a comparison operator */
  isComparison?: boolean;
}

/**
 * Get parameter names from function args (for signature help)
 * Optional args are suffixed with '?'
 */
export function getMathParameterNames(func: MathFunctionDefinition): string[] {
  return func.args.map((arg) => (arg.optional ? `${arg.name}?` : arg.name));
}

// Logarithmic Functions
export const LOGARITHMIC_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'log',
    signature: 'log(value)',
    description: i18n.translate('xpack.streams.math.docs.log', {
      defaultMessage: 'Returns the natural logarithm (base e) of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'logarithmic',
    example: 'log(attributes.bytes)',
  },
];

// Comparison Functions (return boolean)
export const COMPARISON_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'eq',
    signature: 'eq(left, right)',
    description: i18n.translate('xpack.streams.math.docs.eq', {
      defaultMessage:
        'Returns true if values are equal, false otherwise. Equivalent to the == operator.',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'eq(attributes.status_code, 200)',
  },
  {
    name: 'neq',
    signature: 'neq(left, right)',
    description: i18n.translate('xpack.streams.math.docs.neq', {
      defaultMessage:
        'Returns true if values are not equal, false otherwise. Use this function for inequality checks (the != operator is not supported).',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'neq(attributes.error_count, 0)',
  },
  {
    name: 'gt',
    signature: 'gt(left, right)',
    description: i18n.translate('xpack.streams.math.docs.gt', {
      defaultMessage:
        'Returns true if left > right, false otherwise. Equivalent to the > operator.',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'gt(attributes.response_time_ms, 1000)',
  },
  {
    name: 'gte',
    signature: 'gte(left, right)',
    description: i18n.translate('xpack.streams.math.docs.gte', {
      defaultMessage:
        'Returns true if left >= right, false otherwise. Equivalent to the >= operator.',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'gte(attributes.memory_percent, 90)',
  },
  {
    name: 'lt',
    signature: 'lt(left, right)',
    description: i18n.translate('xpack.streams.math.docs.lt', {
      defaultMessage:
        'Returns true if left < right, false otherwise. Equivalent to the < operator.',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'lt(attributes.latency_ms, 100)',
  },
  {
    name: 'lte',
    signature: 'lte(left, right)',
    description: i18n.translate('xpack.streams.math.docs.lte', {
      defaultMessage:
        'Returns true if left <= right, false otherwise. Equivalent to the <= operator.',
    }),
    args: [
      { name: 'left', type: 'number' },
      { name: 'right', type: 'number' },
    ],
    category: 'comparison',
    returnsBoolean: true,
    example: 'lte(attributes.retry_count, 3)',
  },
];

// Operators

export const ARITHMETIC_OPERATORS: OperatorDefinition[] = [
  { symbol: '+', description: 'Addition' },
  { symbol: '-', description: 'Subtraction' },
  { symbol: '*', description: 'Multiplication' },
  { symbol: '/', description: 'Division' },
];

export const COMPARISON_OPERATORS: OperatorDefinition[] = [
  { symbol: '>', description: 'Greater than', isComparison: true },
  { symbol: '>=', description: 'Greater than or equal', isComparison: true },
  { symbol: '<', description: 'Less than', isComparison: true },
  { symbol: '<=', description: 'Less than or equal', isComparison: true },
  { symbol: '==', description: 'Equal', isComparison: true },
  // Note: != is NOT supported. Use neq(a, b) function instead.
];

/**
 * All math functions - the complete list
 */
export const ALL_MATH_FUNCTIONS: MathFunctionDefinition[] = [
  ...LOGARITHMIC_FUNCTIONS,
  ...COMPARISON_FUNCTIONS,
];

/**
 * All operators
 */
export const ALL_OPERATORS: OperatorDefinition[] = [
  ...ARITHMETIC_OPERATORS,
  ...COMPARISON_OPERATORS,
];

/**
 * Set of function names that return boolean values.
 */
export const BOOLEAN_RETURNING_MATH_FUNCTIONS = new Set(COMPARISON_FUNCTIONS.map((f) => f.name));

/**
 * Set of all function names for validation
 */
export const ALL_FUNCTION_NAMES = new Set(ALL_MATH_FUNCTIONS.map((f) => f.name));

const FUNCTION_MAP = new Map(ALL_MATH_FUNCTIONS.map((f) => [f.name, f]));

/**
 * Get function definition by name
 */
export function getMathFunctionDefinition(name: string): MathFunctionDefinition | undefined {
  return FUNCTION_MAP.get(name);
}

/**
 * Get functions by category
 */
export function getMathFunctionsByCategory(
  category: MathFunctionCategory
): MathFunctionDefinition[] {
  return ALL_MATH_FUNCTIONS.filter((f) => f.category === category);
}

/**
 * Check if a function returns boolean
 */
export function doesFunctionReturnBoolean(name: string): boolean {
  return BOOLEAN_RETURNING_MATH_FUNCTIONS.has(name);
}

/**
 * Get required argument count for a function
 */
export function getRequiredArgCount(func: MathFunctionDefinition): number {
  return func.args.filter((arg) => !arg.optional).length;
}

/**
 * Get total argument count (including optional) for a function
 */
export function getTotalArgCount(func: MathFunctionDefinition): number {
  return func.args.length;
}

/**
 * Get functions with exactly N required arguments
 */
export function getFunctionsWithArity(arity: number): string[] {
  return ALL_MATH_FUNCTIONS.filter(
    (f) => getRequiredArgCount(f) === arity && getTotalArgCount(f) === arity
  ).map((f) => f.name);
}

/**
 * Get binary comparison function names (eq, neq, lt, gt, lte, gte)
 */
export function getBinaryComparisonFunctions(): string[] {
  return COMPARISON_FUNCTIONS.map((f) => f.name);
}

export const CATEGORY_TO_DOC_SECTION: Record<MathFunctionCategory, string> = {
  logarithmic: 'functions',
  comparison: 'comparison',
};
