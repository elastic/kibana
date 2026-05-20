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
export declare const FUNCTION_REGISTRY: Record<string, FunctionDefinition>;
/**
 * Core binary operators that TinyMath represents as functions.
 * These are handled separately in the transpiler for efficiency.
 */
export declare const BINARY_ARITHMETIC_OPERATORS: {
    readonly add: "+";
    readonly subtract: "-";
    readonly multiply: "*";
    readonly divide: "/";
};
/**
 * Map of rejected TinyMath functions with helpful suggestions.
 * These are valid TinyMath functions but are not supported in the math processor
 * to ensure compatibility across all transpilation targets (OTTL is the limiting factor).
 */
export declare const REJECTED_FUNCTIONS: Record<string, string>;
/**
 * Helper to check if a function name is a supported function
 */
export declare function isSupportedFunction(name: string): boolean;
/**
 * Helper to check if a function name is a rejected function
 */
export declare function isRejectedFunction(name: string): boolean;
/**
 * Get the function definition from the registry
 */
export declare function getFunctionDefinition(name: string): FunctionDefinition | undefined;
/**
 * Get the rejection reason for a function
 */
export declare function getRejectionReason(name: string): string | undefined;
/**
 * Validate that a function's arity matches the expected count
 */
export declare function validateArity(name: string, argCount: number): {
    valid: boolean;
    error?: string;
};
