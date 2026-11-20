/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRecord } from '@kbn/workflows-yaml';

/** The step lists of a parallel step's own body: its `steps`, or each branch's `steps`. */
const parallelBodies = (step: Record<string, unknown>): unknown[] => [
  step.steps,
  ...(Array.isArray(step.branches) ? step.branches.map((b) => isRecord(b) && b.steps) : []),
];

/** The `fallback` list of an `on-failure` / `iteration-on-failure` handler. */
const fallbackOf = (handler: unknown): unknown => isRecord(handler) && handler.fallback;

/** Every step list nested in a step, in any container: bodies, cases, branches and fallbacks. */
const nestedBodies = (step: Record<string, unknown>): unknown[] => [
  ...parallelBodies(step),
  step.else,
  step.default,
  ...(Array.isArray(step.cases) ? step.cases.map((c) => isRecord(c) && c.steps) : []),
  fallbackOf(step['on-failure']),
  fallbackOf(step['iteration-on-failure']),
];

/**
 * True when `stepName` is a direct child of a `parallel` step's body (`steps`, or a branch's
 * `steps`). The engine rejects a step-level `if`, `on-failure` or `timeout` on such a step: the
 * parallel executor walks a branch as a straight line and cannot drive their wrapper nodes.
 */
export const isInParallelBody = (steps: unknown, stepName: string): boolean => {
  if (!Array.isArray(steps)) return false;
  return steps.some((step) => {
    if (!isRecord(step)) return false;
    if (
      step.type === 'parallel' &&
      parallelBodies(step).some(
        (body) =>
          Array.isArray(body) && body.some((child) => isRecord(child) && child.name === stepName)
      )
    ) {
      return true;
    }
    return nestedBodies(step).some((body) => isInParallelBody(body, stepName));
  });
};
