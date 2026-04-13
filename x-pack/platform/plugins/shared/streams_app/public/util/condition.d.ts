import type { AlwaysCondition, Condition, FilterCondition, OperatorKeys, ShorthandBinaryFilterCondition } from '@kbn/streamlang';
import { isArrayOperator } from '@kbn/streamlang';
export { isArrayOperator };
export declare const EMPTY_EQUALS_CONDITION: ShorthandBinaryFilterCondition;
export declare function alwaysToEmptyEquals<T extends Condition>(condition: T): Exclude<T, AlwaysCondition>;
export declare function emptyEqualsToAlways(condition: Condition): Condition;
export declare function undefinedToAlways(condition: Condition | undefined): Condition;
export declare const isConditionEditableInUi: (condition: Condition) => condition is FilterCondition | AlwaysCondition;
export declare function isShorthandBooleanFilterCondition(condition: FilterCondition): condition is ShorthandBinaryFilterCondition;
export declare function conditionNeedsValueField(condition: FilterCondition): boolean;
/**
 * Get the field name from a filter condition.
 * @param condition condition to extract field name from
 * @returns field name or undefined if not a filter condition
 */
export declare const getFilterConditionField: (condition: Condition) => string | undefined;
/**
 * Get the operator from a filter condition.
 * @param condition condition to extract operator from
 * @returns operator or undefined if not a filter condition
 */
export declare const getFilterConditionOperator: (condition: Condition) => OperatorKeys | undefined;
