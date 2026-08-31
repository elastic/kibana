/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineStepWithUIAttributes } from '../types';

/**
 * Recursively collects all descendant step IDs
 * for a given parent step ID.
 */
export function collectDescendantStepIds(steps: PipelineStepWithUIAttributes[], parentId: string) {
  const ids = new Set<string>();

  steps.forEach((step) => {
    if (step.parentId === parentId && step.customIdentifier) {
      ids.add(step.customIdentifier);
      collectDescendantStepIds(steps, step.customIdentifier).forEach((childId) => ids.add(childId));
    }
  });

  return ids;
}
