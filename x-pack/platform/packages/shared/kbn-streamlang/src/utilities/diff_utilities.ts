/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { StreamlangDSL, StreamlangStep } from '../../types/streamlang';
import { isActionBlock, isConditionBlock } from '../../types/streamlang';

/**
 * Recursively removes customIdentifier from all steps in the DSL.
 * This creates a new DSL object without modifying the original.
 * Useful for comparing DSLs based on content only, ignoring internal tracking IDs.
 */
export function stripCustomIdentifiers(dsl: StreamlangDSL): StreamlangDSL {
  const stripFromSteps = (steps: StreamlangStep[]): StreamlangStep[] => {
    return steps.map((step) => {
      const { customIdentifier, ...restOfStep } = step;

      if (isConditionBlock(step)) {
        // Handle where blocks with nested steps
        return {
          ...restOfStep,
          condition: {
            ...step.condition,
            steps: stripFromSteps(step.condition.steps),
          },
        };
      } else {
        // Handle action blocks
        return restOfStep;
      }
    });
  };

  return {
    ...dsl,
    steps: stripFromSteps(dsl.steps),
  };
}

export const addDeterministicCustomIdentifiers = (dsl: StreamlangDSL): StreamlangDSL => {
  // Deep clone the DSL to avoid mutating the original (we can get away with parse / stringify at
  // the moment due to basic primitives in the DSL structure)
  const clonedDSL = JSON.parse(JSON.stringify(dsl)) as StreamlangDSL;
  // Strip all existing identifiers first to ensure deterministic hashing
  const cleanedDSL = stripCustomIdentifiers(clonedDSL);
  addStepIdentifiers(cleanedDSL.steps);
  return cleanedDSL;
};
/**
 * Adds a generated customIdentifier to each step
 * This is a combination of a hash of the step's content and the step's path within the DSL.
 */
export function addStepIdentifiers(steps: StreamlangStep[], path = 'root') {
  if (Array.isArray(steps)) {
    steps.forEach((step, i) => {
      const { stepPath } = addIdentifierToStep(step, path, i);

      // Only recurse into nested steps for where blocks
      if (isConditionBlock(step) && Array.isArray(step.condition?.steps)) {
        addStepIdentifiers(step.condition.steps, stepPath);
      }
    });
  }

  // No need to recurse into other nested objects, only where blocks have nested steps
  return steps;
}

export const addIdentifierToStep = (step: StreamlangStep, path: string, index: number) => {
  // Remove any existing customIdentifier before assigning a new one
  if ('customIdentifier' in step) {
    delete step.customIdentifier;
  }

  // Use just the step path as the identifier - this is sufficient since we only
  // diff for additive changes now (new steps at end), not content modifications
  const stepPath = `${path}.steps[${index}]`;
  step.customIdentifier = stepPath;

  return { step, stepPath };
};

/**
 * Result of checking if changes are purely additive
 */
export interface AdditiveChangesResult {
  /** True if changes are purely additive (only new steps at the end, no modifications or deletions) */
  isPurelyAdditive: boolean;
  /** New steps added at the end (only populated if isPurelyAdditive is true) */
  newSteps: StreamlangStep[];
  /** Array of customIdentifiers from all new steps, including nested steps (only populated if isPurelyAdditive is true) */
  newStepIds?: string[];
}

/**
 * Checks if changes between two DSLs are purely additive (new steps at the end only).
 * 1. Compares steps sequentially from the beginning
 * 2. Stops immediately when finding a difference
 * 3. Only returns new steps if all previous steps match exactly
 *
 * @param previousDSL - The previous state of the DSL
 * @param nextDSL - The new state of the DSL
 * @returns Result indicating if changes are purely additive and what the new steps are
 */
/**
 * Collects the custom identifiers for a slice of steps (including nested where branches)
 * into the provided set. The set is used instead of an array so callers can union
 * results from multiple branches without worrying about duplicates.
 */
const collectStepIds = (steps: StreamlangStep[], target: Set<string>) => {
  for (const step of steps) {
    if ('customIdentifier' in step && step.customIdentifier) {
      target.add(step.customIdentifier);
    }

    if (isConditionBlock(step) && step.condition?.steps) {
      collectStepIds(step.condition.steps, target);
    }
  }
};

/**
 * Normalises a step so it can be compared for structural equality.
 *
 * - `customIdentifier` is removed because identifiers are re-generated when the
 *   content of a step changes. We only care that the *shape* of the persisted
 *   step matches what existed previously.
 * - For where blocks we keep the `where` metadata but drop the `steps` array.
 *   This allows the diff to recurse and compare the nested steps separately,
 *   while ensuring that any change to the meta information (field/eq/etc.)
 *   still breaks the equality check.
 */
const stripNestedStepsForComparison = (step: StreamlangStep) => {
  const { customIdentifier, ...restOfStep } = step as StreamlangStep & {
    customIdentifier?: string;
  };

  if (isConditionBlock(step) && step.condition) {
    const { steps, ...conditionWithoutSteps } = step.condition;
    return {
      ...restOfStep,
      condition: {
        ...conditionWithoutSteps,
        steps: [],
      },
    };
  }

  return restOfStep;
};

const diffStepsForAdditions = (
  previousSteps: StreamlangStep[],
  nextSteps: StreamlangStep[]
):
  | {
      isPurelyAdditive: true;
      appendedSteps: StreamlangStep[];
      newStepIds: Set<string>;
    }
  | {
      isPurelyAdditive: false;
    } => {
  // If the next array is shorter we already lost data; this is never additive.
  if (nextSteps.length < previousSteps.length) {
    return { isPurelyAdditive: false };
  }

  const newStepIds = new Set<string>();

  for (let i = 0; i < previousSteps.length; i++) {
    const previousStep = previousSteps[i];
    const nextStep = nextSteps[i];

    if (!nextStep) {
      return { isPurelyAdditive: false };
    }

    const prevComparable = stripNestedStepsForComparison(previousStep);
    const nextComparable = stripNestedStepsForComparison(nextStep);

    // Any difference in the "shape" of the persisted step (whether action or where)
    // means the change is not purely additive.
    if (objectHash(prevComparable) !== objectHash(nextComparable)) {
      return { isPurelyAdditive: false };
    }

    if (isConditionBlock(previousStep) && isConditionBlock(nextStep)) {
      const previousNested = previousStep.condition?.steps ?? [];
      const nextNested = nextStep.condition?.steps ?? [];

      const nestedDiff = diffStepsForAdditions(previousNested, nextNested);

      if (!nestedDiff.isPurelyAdditive) {
        return { isPurelyAdditive: false };
      }

      // Merge nested additions into the current result so callers receive the
      // identifiers for new nested steps as well as any parent where blocks that changed.
      nestedDiff.newStepIds.forEach((id) => newStepIds.add(id));
    } else if (objectHash(previousStep) !== objectHash(nextStep)) {
      // Non-where steps must be identical
      return { isPurelyAdditive: false };
    }
  }

  // Whatever remains at the tail of the array is truly new at this level.
  const appendedSteps = nextSteps.slice(previousSteps.length);
  collectStepIds(appendedSteps, newStepIds);

  return {
    isPurelyAdditive: true,
    appendedSteps,
    newStepIds,
  };
};

export const checkAdditiveChanges = (
  previousDSL: StreamlangDSL,
  nextDSL: StreamlangDSL
): AdditiveChangesResult => {
  const diff = diffStepsForAdditions(previousDSL.steps, nextDSL.steps);

  if (!diff.isPurelyAdditive) {
    return {
      isPurelyAdditive: false,
      newSteps: [],
      newStepIds: [],
    };
  }

  return {
    isPurelyAdditive: true,
    newSteps: diff.appendedSteps,
    newStepIds: Array.from(diff.newStepIds),
  };
};

/**
 * Counts the total number of processors (action blocks) in a DSL.
 * This function recursively traverses the entire DSL, including nested steps in where blocks,
 * and counts only action blocks (not where blocks themselves).
 *
 * @param dsl - The Streamlang DSL to count processors in
 * @returns The total count of action blocks
 */
export const getProcessorsCount = (dsl: StreamlangDSL): number => {
  let count = 0;

  const traverseSteps = (steps: StreamlangStep[]) => {
    for (const step of steps) {
      if (isActionBlock(step)) {
        // Count action blocks
        count++;
      } else if (isConditionBlock(step) && step.condition?.steps) {
        // Recursively traverse nested steps in where blocks
        traverseSteps(step.condition.steps);
      }
    }
  };

  traverseSteps(dsl.steps);

  return count;
};
