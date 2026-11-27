/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStep, visitStepChildSlots } from '@kbn/workflows';

/**
 * True when `stepName` is a direct child of a `parallel` step's body (`steps`, or a branch's
 * `steps`). The engine rejects a step-level `if`, `on-failure` or `timeout` on such a step: the
 * parallel executor walks a branch as a straight line and cannot drive their wrapper nodes.
 */
export const isInParallelBody = (steps: unknown, stepName: string): boolean => {
  if (!Array.isArray(steps)) return false;
  return steps.some((step) => {
    if (!isStep(step)) return false;
    let found = false;
    visitStepChildSlots(step, ({ kind }, children) => {
      const isParallelBody = step.type === 'parallel' && (kind === 'steps' || kind === 'branch');
      found =
        found ||
        (isParallelBody && children.some((child) => child.name === stepName)) ||
        isInParallelBody(children, stepName);
    });
    return found;
  });
};
