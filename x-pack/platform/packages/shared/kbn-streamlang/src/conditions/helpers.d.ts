import type { ShorthandBinaryFilterCondition, RangeCondition, StringOrNumberOrBoolean, OperatorKeys, ShorthandUnaryFilterCondition, FilterCondition, Condition } from '../../types/conditions';
export declare function getBinaryFilterOperator(condition: ShorthandBinaryFilterCondition): keyof Omit<ShorthandBinaryFilterCondition, 'field'> | undefined;
export declare function getBinaryFilterValue(condition: ShorthandBinaryFilterCondition): StringOrNumberOrBoolean | RangeCondition | undefined;
export declare function getBinaryFilterField(condition: ShorthandBinaryFilterCondition): string;
export declare function getUnaryFilterOperator(condition: ShorthandUnaryFilterCondition): keyof Omit<ShorthandUnaryFilterCondition, 'field'> | undefined;
export declare function getUnaryFilterValue(condition: ShorthandUnaryFilterCondition): unknown;
export declare function getUnaryFilterField(condition: ShorthandUnaryFilterCondition): string;
export declare function getFilterValue(condition: FilterCondition): StringOrNumberOrBoolean | RangeCondition | undefined;
export declare function getFilterOperator(condition: FilterCondition): OperatorKeys | undefined;
export declare function getDefaultFormValueForOperator(operator: OperatorKeys): string | number | boolean | object;
export declare function isFilterConditionObject(condition: Condition): condition is FilterCondition;
export declare function getConditionFields(condition: Condition): Array<{
    name: string;
    type: 'boolean' | 'number' | 'string';
}>;
/**
 * Checks if a condition is complete and ready to be used.
 * A condition is complete if:
 * - It's undefined (optional conditions)
 * - It has a non-empty field
 * - Its value is complete based on operator type:
 *   - Range: both lower and upper bounds are filled
 *   - Boolean (exists): any boolean is valid
 *   - String/Number: value is not empty
 */
export declare function isConditionComplete(condition: Condition | undefined): boolean;
export declare const isArrayOperator: (operator: OperatorKeys | undefined) => boolean;
