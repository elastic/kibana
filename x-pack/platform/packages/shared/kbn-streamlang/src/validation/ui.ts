/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionBlock, type StreamlangDSL } from '../../types/streamlang';

// Validations specific to the Streams' processing UI.
export const validateStreamlangModeCompatibility = (dsl: StreamlangDSL) => {
  let canBeRepresentedInInteractiveMode = true;
  const canBeRepresentedInYAMLMode = true;
  const errors: string[] = [];

  const tooDeeplyNested = violatesConditionDepth(dsl.steps);

  if (tooDeeplyNested) {
    errors.push(`Conditions are nested too deeply to be represented in interactive mode.`);
    canBeRepresentedInInteractiveMode = false;
  }

  return { canBeRepresentedInInteractiveMode, canBeRepresentedInYAMLMode, errors };
};

// When conditions are nested more than 3 levels deep, the processing UI cannot represent them
// in interactive mode. YAML mode must be used.
const violatesConditionDepth = (
  steps: StreamlangDSL['steps'],
  currentDepth: number = 0
): boolean => {
  for (const step of steps) {
    if (isActionBlock(step)) {
      continue;
    }

    const condition = step.condition;
    const newDepth = currentDepth + 1;

    if (newDepth > 3) {
      return true;
    }

    if (condition.steps && condition.steps.length > 0) {
      if (violatesConditionDepth(condition.steps, newDepth)) {
        return true;
      }
    }
  }

  return false;
};
