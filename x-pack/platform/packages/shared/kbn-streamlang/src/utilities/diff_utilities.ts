/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { StreamlangDSL, StreamlangStep } from '../../types/streamlang';
import { isActionBlock, isWhereBlock } from '../../types/streamlang';

/**
 * Recursively removes customIdentifier from all steps in the DSL.
 * This creates a new DSL object without modifying the original.
 * Useful for comparing DSLs based on content only, ignoring internal tracking IDs.
 */
export function stripCustomIdentifiers(dsl: StreamlangDSL): StreamlangDSL {
  const stripFromSteps = (steps: StreamlangStep[]): StreamlangStep[] => {
    return steps.map((step) => {
      const { customIdentifier, ...restOfStep } = step;

      if (isWhereBlock(step)) {
        // Handle where blocks with nested steps
        return {
          ...restOfStep,
          where: {
            ...step.where,
            steps: stripFromSteps(step.where.steps),
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
      if (isWhereBlock(step) && Array.isArray(step.where?.steps)) {
        addStepIdentifiers(step.where.steps, stepPath);
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

  const stepPath = `${path}.steps[${index}]`;
  const contentHash = objectHash(step);
  const id = `${contentHash}${stepPath}`;
  step.customIdentifier = id;

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
export const checkAdditiveChanges = (
  previousDSL: StreamlangDSL,
  nextDSL: StreamlangDSL
): AdditiveChangesResult => {
  const previousSteps = previousDSL.steps;
  const nextSteps = nextDSL.steps;

  // If next has fewer steps than previous, it's not purely additive
  if (nextSteps.length < previousSteps.length) {
    return { isPurelyAdditive: false, newSteps: [], newStepIds: [] };
  }

  // Compare each step in the previous DSL with the corresponding step in next DSL
  // Use object hash for efficient deep comparison
  for (let i = 0; i < previousSteps.length; i++) {
    const previousHash = objectHash(previousSteps[i]);
    const nextHash = objectHash(nextSteps[i]);

    // If any step differs, it's not purely additive
    if (previousHash !== nextHash) {
      return { isPurelyAdditive: false, newSteps: [], newStepIds: [] };
    }
  }

  // All previous steps match - return the new steps at the end
  const newSteps = nextSteps.slice(previousSteps.length);

  // Traverse the new steps in a recursive manner to collect stepIds
  const newStepIds: string[] = [];

  const collectStepIds = (steps: StreamlangStep[]) => {
    for (const step of steps) {
      if ('customIdentifier' in step && step.customIdentifier) {
        newStepIds.push(step.customIdentifier);
      }

      // Recursively collect IDs from nested steps in where blocks
      if (isWhereBlock(step) && step.where?.steps) {
        collectStepIds(step.where.steps);
      }
    }
  };

  collectStepIds(newSteps);

  return {
    isPurelyAdditive: true,
    newSteps,
    newStepIds,
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
      } else if (isWhereBlock(step) && step.where?.steps) {
        // Recursively traverse nested steps in where blocks
        traverseSteps(step.where.steps);
      }
    }
  };

  traverseSteps(dsl.steps);

  return count;
};
