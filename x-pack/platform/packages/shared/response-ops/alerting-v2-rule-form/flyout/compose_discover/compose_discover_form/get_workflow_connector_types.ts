/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';
import { getBaseConnectorType } from '@kbn/workflows-ui';

// Flow-control, trigger, and built-in step base types that are not external connectors.
const STRUCTURAL_BASE_TYPES = new Set([
  'if',
  'foreach',
  'while',
  'parallel',
  'switch',
  'merge',
  'wait',
  'waitForInput',
  'waitForApproval',
  'workflow',
  'manual',
  'alert',
  'scheduled',
  'data',
  'console',
]);

/** Distinct base connector types used by a workflow definition, in first-seen order. */
export const getWorkflowConnectorTypes = (
  definition: WorkflowYaml | null | undefined
): string[] => {
  if (definition == null || !Array.isArray(definition.steps)) {
    return [];
  }
  try {
    const allSteps = collectAllSteps(definition.steps);
    const bases = allSteps
      .filter((step) => step?.type)
      .map((step) => getBaseConnectorType(step.type))
      .filter((base) => !STRUCTURAL_BASE_TYPES.has(base));
    return [...new Set(bases)];
  } catch {
    return [];
  }
};

/** Unions connector types across workflow definitions, preserving first-seen order. */
export const unionWorkflowConnectorTypes = (
  definitions: Array<WorkflowYaml | null | undefined>
): string[] => {
  const seen = new Set<string>();
  const union: string[] = [];
  for (const definition of definitions) {
    for (const type of getWorkflowConnectorTypes(definition)) {
      if (!seen.has(type)) {
        seen.add(type);
        union.push(type);
      }
    }
  }
  return union;
};
