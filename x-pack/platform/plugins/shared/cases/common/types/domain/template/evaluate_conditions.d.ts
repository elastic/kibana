import type { ConditionRule, CompoundCondition } from './fields';
/**
 * Evaluates a condition (simple rule or compound AND/OR) against a map of field values.
 *
 * @param condition - The condition to evaluate (ConditionRule or CompoundCondition)
 * @param fieldValues - Map of fieldName -> current value
 * @param fieldTypeMap - Map of fieldName -> type; unknown fields default to true
 * @param fieldControlMap - Map of fieldName -> control (e.g. CHECKBOX_GROUP)
 */
export declare const evaluateCondition: (condition: ConditionRule | CompoundCondition, fieldValues: Record<string, unknown>, fieldTypeMap: Record<string, string>, fieldControlMap?: Record<string, string>) => boolean;
