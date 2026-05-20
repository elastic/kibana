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
export declare function validateMathExpression(expression: string): ValidationResult;
/**
 * Get a list of all supported function names for documentation/autocomplete
 */
export declare function getSupportedFunctionNames(): string[];
