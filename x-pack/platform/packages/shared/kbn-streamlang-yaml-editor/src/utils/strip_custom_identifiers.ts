/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL, StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { isConditionBlock } from '@kbn/streamlang';

/**
 * Recursively removes customIdentifier from all steps in the DSL.
 * This is used to clean the DSL before displaying it to users, as customIdentifiers
 * are internal implementation details used for tracking and should not be visible.
 */
export function stripCustomIdentifiers(dsl: StreamlangDSL): StreamlangDSL {
  const stripFromSteps = (steps: StreamlangStep[]): StreamlangStep[] => {
    return steps.map((step) => {
      if (isConditionBlock(step)) {
        // Handle condition blocks with nested steps
        const { customIdentifier, ...restOfStep } = step as any;
        return {
          ...restOfStep,
          condition: {
            ...step.condition,
            steps: stripFromSteps(step.condition.steps),
          },
        };
      } else {
        // Handle action blocks
        const { customIdentifier, ...restOfStep } = step as any;
        return restOfStep;
      }
    });
  };

  return {
    ...dsl,
    steps: stripFromSteps(dsl.steps),
  };
}
