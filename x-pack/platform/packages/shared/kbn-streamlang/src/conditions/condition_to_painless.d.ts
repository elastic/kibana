import type { Condition } from '../../types/conditions';
type FieldVarMap = Map<string, string>;
export declare function conditionToStatement(condition: Condition, nested?: boolean, varMap?: FieldVarMap): string;
export declare function conditionToPainless(condition: Condition): string;
/**
 * Compiles a condition to a Painless script that sets a boolean variable instead of returning.
 * This is useful for combining conditions where we need to check multiple conditions in sequence.
 *
 * @param condition The condition to compile
 * @param resultVar The name of the boolean variable to set (should be declared beforehand)
 * @returns A Painless script block that sets the resultVar to true/false based on the condition
 *
 * @example
 * // For condition: { field: 'status', eq: 'active' }
 * // Returns:
 * // try {
 * //   def val_status = $('status', null); ...
 * //   if ((val_status !== null && val_status == "active")) {
 * //     _conditionMet = true;
 * //   }
 * // } catch (Exception e) { }
 */
export declare function conditionToPainlessCheck(condition: Condition, resultVar: string): string;
export {};
