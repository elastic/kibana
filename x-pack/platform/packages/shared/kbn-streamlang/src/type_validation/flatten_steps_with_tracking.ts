/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { StreamlangStep } from '../../types/streamlang';
import { isWhereBlockSchema } from '../../types/streamlang';

/**
 * A processor with information about whether it's conditional.
 */
export interface ProcessorWithConditionalInfo {
  processor: StreamlangProcessorDefinition;
  isConditional: boolean;
}

/**
 * Flattens Streamlang steps for type validation purposes.
 * Tracks whether each processor is inside a conditional block.
 * Unlike the transpiler version, we don't care about combining conditions,
 * just whether the step is conditional or not.
 */
export function flattenStepsWithTracking(
  steps: StreamlangStep[],
  isConditional: boolean = false
): ProcessorWithConditionalInfo[] {
  return steps.flatMap((step) => {
    // Handle where blocks (conditional execution)
    if (isWhereBlockSchema(step)) {
      const conditionWithSteps = step.where;
      // All steps inside a where block are conditional
      return flattenStepsWithTracking(conditionWithSteps.steps, true);
    }

    // Handle processor steps
    const processor = step;
    // If the processor has an inline where condition, it's also conditional
    const processorIsConditional = isConditional || ('where' in processor && !!processor.where);

    return [
      {
        processor,
        isConditional: processorIsConditional,
      },
    ];
  });
}
