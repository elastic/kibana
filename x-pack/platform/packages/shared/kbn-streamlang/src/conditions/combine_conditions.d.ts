import type { Condition } from '../../types/conditions';
/**
 * Combines two conditions with logical AND. Undefined operands are ignored.
 */
export declare function combineConditionsAsAnd(condA?: Condition, condB?: Condition): Condition | undefined;
/**
 * Effective `where` for steps in the else branch of a condition block: the
 * inherited parent scope combined with NOT(block predicate), where
 * `blockPredicate` is the condition object with `steps` / `else` stripped.
 *
 * Shared by {@link flattenSteps} and simulation noop injection so transpilation
 * and simulation stay aligned.
 */
export declare function combineConditionsForElseBranch(parentCondition: Condition | undefined, blockPredicate: Condition): Condition | undefined;
