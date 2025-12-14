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
 * It defines all functions, operators, constants, and their metadata used for:
 * - Documentation
 * - Autocomplete
 * - Syntax highlighting
 * - Validation
 * - Type inference
 */

export type MathFunctionCategory =
  | 'arithmetic'
  | 'rounding'
  | 'trigonometry'
  | 'logarithmic'
  | 'comparison'
  | 'constant';

export interface MathFunctionArg {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface MathFunctionDefinition {
  /** Function name (e.g., 'abs', 'sqrt') */
  name: string;
  /** Function signature for display (e.g., 'abs(value)') */
  signature: string;
  /** i18n description for documentation and autocomplete */
  description: string;
  /** Typed arguments - used for docs and to derive parameter names for signature help */
  args: MathFunctionArg[];
  /** Category for grouping */
  category: MathFunctionCategory;
  /** Whether this is a constant (0-arity function) */
  isConstant?: boolean;
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

// Arithmetic Functions
export const ARITHMETIC_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'abs',
    signature: 'abs(value)',
    description: i18n.translate('xpack.streams.math.docs.abs', {
      defaultMessage:
        'Calculates absolute value. Negative values are multiplied by -1; positive values remain unchanged.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'arithmetic',
    example: 'abs(attributes.temperature_delta)',
  },
  {
    name: 'sqrt',
    signature: 'sqrt(value)',
    description: i18n.translate('xpack.streams.math.docs.sqrt', {
      defaultMessage: 'Calculates the square root. Returns null for negative values.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'arithmetic',
    example: 'sqrt(pow(attributes.x, 2) + pow(attributes.y, 2))',
  },
  {
    name: 'cbrt',
    signature: 'cbrt(value)',
    description: i18n.translate('xpack.streams.math.docs.cbrt', {
      defaultMessage: 'Calculates the cube root of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'arithmetic',
    example: 'cbrt(attributes.volume)',
  },
  {
    name: 'exp',
    signature: 'exp(value)',
    description: i18n.translate('xpack.streams.math.docs.exp', {
      defaultMessage: "Raises e (Euler's number) to the power of value.",
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'arithmetic',
    example: 'exp(attributes.growth_rate)',
  },
  {
    name: 'signum',
    signature: 'signum(value)',
    description: i18n.translate('xpack.streams.math.docs.signum', {
      defaultMessage: 'Returns the sign of the value: -1 for negative, 0 for zero, 1 for positive.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'arithmetic',
    example: 'signum(attributes.delta)',
  },
  {
    name: 'pow',
    signature: 'pow(base, exponent)',
    description: i18n.translate('xpack.streams.math.docs.pow', {
      defaultMessage: 'Raises the base to the power of the exponent.',
    }),
    args: [
      { name: 'base', type: 'number' },
      { name: 'exponent', type: 'number' },
    ],
    category: 'arithmetic',
    example: 'pow(attributes.side_length, 3)',
  },
  {
    name: 'hypot',
    signature: 'hypot(x, y)',
    description: i18n.translate('xpack.streams.math.docs.hypot', {
      defaultMessage: 'Returns the hypotenuse: sqrt(x² + y²). Useful for calculating distances.',
    }),
    args: [
      { name: 'x', type: 'number' },
      { name: 'y', type: 'number' },
    ],
    category: 'arithmetic',
    example: 'hypot(attributes.delta_x, attributes.delta_y)',
  },
  {
    name: 'mod',
    signature: 'mod(value, divisor)',
    description: i18n.translate('xpack.streams.math.docs.mod', {
      defaultMessage: 'Returns the remainder after division (modulo operation).',
    }),
    args: [
      { name: 'value', type: 'number' },
      { name: 'divisor', type: 'number' },
    ],
    category: 'arithmetic',
    example: 'mod(attributes.request_id, 100)',
  },
];

// Rounding Functions
export const ROUNDING_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'ceil',
    signature: 'ceil(value)',
    description: i18n.translate('xpack.streams.math.docs.ceil', {
      defaultMessage: 'Rounds up to the nearest integer.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'rounding',
    example: 'ceil(attributes.price)',
  },
  {
    name: 'floor',
    signature: 'floor(value)',
    description: i18n.translate('xpack.streams.math.docs.floor', {
      defaultMessage: 'Rounds down to the nearest integer.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'rounding',
    example: 'floor(attributes.duration_ms / 1000)',
  },
  {
    name: 'round',
    signature: 'round(value, [decimals])',
    description: i18n.translate('xpack.streams.math.docs.round', {
      defaultMessage: 'Rounds to a specific number of decimal places. Defaults to 0.',
    }),
    args: [
      { name: 'value', type: 'number' },
      { name: 'decimals', type: 'number', optional: true, defaultValue: '0' },
    ],
    category: 'rounding',
    example: 'round(attributes.cpu_percent, 2)',
  },
];

// Trigonometric Functions
export const TRIGONOMETRY_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'sin',
    signature: 'sin(angle)',
    description: i18n.translate('xpack.streams.math.docs.sin', {
      defaultMessage: 'Returns the sine of an angle in radians.',
    }),
    args: [{ name: 'angle', type: 'number (radians)' }],
    category: 'trigonometry',
    example: 'sin(attributes.angle_rad)',
  },
  {
    name: 'cos',
    signature: 'cos(angle)',
    description: i18n.translate('xpack.streams.math.docs.cos', {
      defaultMessage: 'Returns the cosine of an angle in radians.',
    }),
    args: [{ name: 'angle', type: 'number (radians)' }],
    category: 'trigonometry',
    example: 'cos(attributes.angle_rad)',
  },
  {
    name: 'tan',
    signature: 'tan(angle)',
    description: i18n.translate('xpack.streams.math.docs.tan', {
      defaultMessage: 'Returns the tangent of an angle in radians.',
    }),
    args: [{ name: 'angle', type: 'number (radians)' }],
    category: 'trigonometry',
    example: 'tan(attributes.angle_rad)',
  },
  {
    name: 'asin',
    signature: 'asin(value)',
    description: i18n.translate('xpack.streams.math.docs.asin', {
      defaultMessage: 'Returns the arc sine (inverse sine) of a value in radians.',
    }),
    args: [{ name: 'value', type: 'number (-1 to 1)' }],
    category: 'trigonometry',
    example: 'asin(attributes.ratio)',
  },
  {
    name: 'acos',
    signature: 'acos(value)',
    description: i18n.translate('xpack.streams.math.docs.acos', {
      defaultMessage: 'Returns the arc cosine (inverse cosine) of a value in radians.',
    }),
    args: [{ name: 'value', type: 'number (-1 to 1)' }],
    category: 'trigonometry',
    example: 'acos(attributes.ratio)',
  },
  {
    name: 'atan',
    signature: 'atan(value)',
    description: i18n.translate('xpack.streams.math.docs.atan', {
      defaultMessage: 'Returns the arc tangent (inverse tangent) of a value in radians.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'trigonometry',
    example: 'atan(attributes.slope)',
  },
  {
    name: 'atan_two',
    signature: 'atan_two(y, x)',
    description: i18n.translate('xpack.streams.math.docs.atanTwo', {
      defaultMessage:
        'Returns the angle in radians between the positive x-axis and the point (x, y). Useful for converting rectangular to polar coordinates.',
    }),
    args: [
      { name: 'y', type: 'number' },
      { name: 'x', type: 'number' },
    ],
    category: 'trigonometry',
    example: 'atan_two(attributes.delta_y, attributes.delta_x)',
  },
  {
    name: 'sinh',
    signature: 'sinh(value)',
    description: i18n.translate('xpack.streams.math.docs.sinh', {
      defaultMessage: 'Returns the hyperbolic sine of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'trigonometry',
    example: 'sinh(attributes.x)',
  },
  {
    name: 'cosh',
    signature: 'cosh(value)',
    description: i18n.translate('xpack.streams.math.docs.cosh', {
      defaultMessage: 'Returns the hyperbolic cosine of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'trigonometry',
    example: 'cosh(attributes.x)',
  },
  {
    name: 'tanh',
    signature: 'tanh(value)',
    description: i18n.translate('xpack.streams.math.docs.tanh', {
      defaultMessage: 'Returns the hyperbolic tangent of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'trigonometry',
    example: 'tanh(attributes.x)',
  },
];

// Logarithmic Functions
export const LOGARITHMIC_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'log',
    signature: 'log(value, [base])',
    description: i18n.translate('xpack.streams.math.docs.log', {
      defaultMessage: 'Logarithm with optional base. Natural log (base e) is the default.',
    }),
    args: [
      { name: 'value', type: 'number' },
      { name: 'base', type: 'number', optional: true, defaultValue: 'e' },
    ],
    category: 'logarithmic',
    example: 'log(attributes.bytes, 2)',
  },
  {
    name: 'log_ten',
    signature: 'log_ten(value)',
    description: i18n.translate('xpack.streams.math.docs.logTen', {
      defaultMessage: 'Returns the base-10 logarithm of a value.',
    }),
    args: [{ name: 'value', type: 'number' }],
    category: 'logarithmic',
    example: 'log_ten(attributes.bytes)',
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

// Constants
export const CONSTANT_FUNCTIONS: MathFunctionDefinition[] = [
  {
    name: 'pi',
    signature: 'pi()',
    description: i18n.translate('xpack.streams.math.docs.pi', {
      defaultMessage: 'Returns the mathematical constant π (pi), approximately 3.14159.',
    }),
    args: [],
    category: 'constant',
    isConstant: true,
    example: 'attributes.radius * pi() * 2',
  },
  {
    name: 'e',
    signature: 'e()',
    description: i18n.translate('xpack.streams.math.docs.e', {
      defaultMessage: "Returns Euler's number e, approximately 2.71828.",
    }),
    args: [],
    category: 'constant',
    isConstant: true,
    example: 'pow(e(), attributes.exponent)',
  },
  {
    name: 'tau',
    signature: 'tau()',
    description: i18n.translate('xpack.streams.math.docs.tau', {
      defaultMessage: 'Returns τ (tau), equal to 2π, approximately 6.28318.',
    }),
    args: [],
    category: 'constant',
    isConstant: true,
    example: 'attributes.radius * tau()',
  },
];

// Operators

export const ARITHMETIC_OPERATORS: OperatorDefinition[] = [
  { symbol: '+', description: 'Addition' },
  { symbol: '-', description: 'Subtraction' },
  { symbol: '*', description: 'Multiplication' },
  { symbol: '/', description: 'Division' },
  // Note: % is NOT supported as an inline operator. Use mod(a, b) function instead.
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
  ...ARITHMETIC_FUNCTIONS,
  ...ROUNDING_FUNCTIONS,
  ...TRIGONOMETRY_FUNCTIONS,
  ...LOGARITHMIC_FUNCTIONS,
  ...COMPARISON_FUNCTIONS,
  ...CONSTANT_FUNCTIONS,
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

/**
 * Set of constant function names
 */
export const CONSTANT_FUNCTION_NAMES = new Set(CONSTANT_FUNCTIONS.map((f) => f.name));

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
 * Get functions with exactly N required arguments (excluding constants)
 */
export function getFunctionsWithArity(arity: number): string[] {
  return ALL_MATH_FUNCTIONS.filter(
    (f) => !f.isConstant && getRequiredArgCount(f) === arity && getTotalArgCount(f) === arity
  ).map((f) => f.name);
}

/**
 * Get functions with variable arity (have optional arguments)
 */
export function getVariableArityFunctions(): string[] {
  return ALL_MATH_FUNCTIONS.filter((f) => !f.isConstant && f.args.some((arg) => arg.optional)).map(
    (f) => f.name
  );
}

/**
 * Get binary comparison function names (eq, neq, lt, gt, lte, gte)
 */
export function getBinaryComparisonFunctions(): string[] {
  return COMPARISON_FUNCTIONS.map((f) => f.name);
}

export const CATEGORY_TO_DOC_SECTION: Record<MathFunctionCategory, string> = {
  arithmetic: 'math',
  rounding: 'math',
  trigonometry: 'trigonometry',
  logarithmic: 'math',
  comparison: 'comparison',
  constant: 'constants',
};
