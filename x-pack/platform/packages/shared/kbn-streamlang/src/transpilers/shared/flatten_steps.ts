/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type { Condition } from '../../../types/conditions';
import type { StreamlangStep } from '../../../types/streamlang';
import { isConditionBlock } from '../../../types/streamlang';

/**
 * Helper to combine two conditions as an "and" logical condition.
 * Accepts two condition objects and returns a new condition object.
 */
function combineConditionsAsAnd(condA?: Condition, condB?: Condition) {
  if (!condA) return condB;
  if (!condB) return condA;
  return { and: [condA, condB] };
}

/**
 * Flattens Streamlang steps. Nested where blocks are recursively processed,
 * returning a flat array of action blocks with combined conditions.
 */
export function flattenSteps(
  steps: StreamlangStep[],
  parentCondition?: Condition
): StreamlangProcessorDefinition[] {
  return steps.flatMap((step) => {
    // Handle condition blocks (conditional execution)
    if (isConditionBlock(step)) {
      const conditionWithSteps = step.condition;
      // Strip steps for the resursive call, everything left is the condition.
      const { steps: nestedSteps, ...rest } = conditionWithSteps;
      // Combine parent and current condition as an "and" condition if both exist
      const combinedCondition = combineConditionsAsAnd(parentCondition, rest);
      // Recursively transpile the steps under this where block, passing down the combined condition
      return flattenSteps(nestedSteps, combinedCondition);
    }

    // Handle processor steps
    const processor = step;
    // If the processor has an inline where, combine with parent as "and"
    if ('where' in processor && processor.where) {
      const { where, ...rest } = processor;
      const combinedCondition = combineConditionsAsAnd(parentCondition, where);
      return [
        {
          ...rest,
          where: combinedCondition,
        },
      ];
    }

    // Normal processor, just return as-is (strip undefined where), but add parentCondition if present
    const processorCopy = { ...processor };
    if ('where' in processorCopy) delete processorCopy.where;
    if (parentCondition) {
      return [{ ...processorCopy, where: parentCondition }];
    }
    return [processorCopy];
  });
}
