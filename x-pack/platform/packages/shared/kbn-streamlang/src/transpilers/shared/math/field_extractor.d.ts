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
export declare function inferMathExpressionReturnType(expression: string): 'number' | 'boolean';
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
export declare function extractFieldsFromMathExpression(expression: string): string[];
