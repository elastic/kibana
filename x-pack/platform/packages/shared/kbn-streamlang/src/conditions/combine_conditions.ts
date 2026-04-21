/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '../../types/conditions';

/**
 * Combines two conditions with logical AND. Undefined operands are ignored.
 */
export function combineConditionsAsAnd(
  condA?: Condition,
  condB?: Condition
): Condition | undefined {
  if (!condA) return condB;
  if (!condB) return condA;
  return { and: [condA, condB] };
}

/**
 * Effective `where` for steps in the else branch of a condition block: the
 * inherited parent scope combined with NOT(block predicate), where
 * `blockPredicate` is the condition object with `steps` / `else` stripped.
 *
 * Shared by {@link flattenSteps} and simulation noop injection so transpilation
 * and simulation stay aligned.
 */
export function combineConditionsForElseBranch(
  parentCondition: Condition | undefined,
  blockPredicate: Condition
): Condition | undefined {
  return combineConditionsAsAnd(parentCondition, { not: blockPredicate });
}
