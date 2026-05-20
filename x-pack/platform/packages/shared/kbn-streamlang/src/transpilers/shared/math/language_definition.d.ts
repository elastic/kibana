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
export declare function getMathParameterNames(func: MathFunctionDefinition): string[];
export declare const LOGARITHMIC_FUNCTIONS: MathFunctionDefinition[];
export declare const COMPARISON_FUNCTIONS: MathFunctionDefinition[];
export declare const ARITHMETIC_OPERATORS: OperatorDefinition[];
export declare const COMPARISON_OPERATORS: OperatorDefinition[];
/**
 * All math functions - the complete list
 */
export declare const ALL_MATH_FUNCTIONS: MathFunctionDefinition[];
/**
 * All operators
 */
export declare const ALL_OPERATORS: OperatorDefinition[];
/**
 * Set of function names that return boolean values.
 */
export declare const BOOLEAN_RETURNING_MATH_FUNCTIONS: Set<string>;
/**
 * Set of all function names for validation
 */
export declare const ALL_FUNCTION_NAMES: Set<string>;
/**
 * Get function definition by name
 */
export declare function getMathFunctionDefinition(name: string): MathFunctionDefinition | undefined;
/**
 * Get functions by category
 */
export declare function getMathFunctionsByCategory(category: MathFunctionCategory): MathFunctionDefinition[];
/**
 * Check if a function returns boolean
 */
export declare function doesFunctionReturnBoolean(name: string): boolean;
/**
 * Get required argument count for a function
 */
export declare function getRequiredArgCount(func: MathFunctionDefinition): number;
/**
 * Get total argument count (including optional) for a function
 */
export declare function getTotalArgCount(func: MathFunctionDefinition): number;
/**
 * Get functions with exactly N required arguments
 */
export declare function getFunctionsWithArity(arity: number): string[];
/**
 * Get binary comparison function names (eq, neq, lt, gt, lte, gte)
 */
export declare function getBinaryComparisonFunctions(): string[];
export declare const CATEGORY_TO_DOC_SECTION: Record<MathFunctionCategory, string>;
