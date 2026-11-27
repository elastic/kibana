/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepChildSlot } from '@kbn/workflows';
import { isStep, visitStepChildSlots } from '@kbn/workflows';

export interface PrecedingStepRef {
  readonly name: string;
  readonly type: string;
}

/**
 * A fallback runs after the step's own body started, so the lists that come before it in the
 * same step may have run; the other arms of an `if`, `switch` or `parallel` never run before it.
 */
const isFallbackSlot = ({ kind }: StepChildSlot): boolean =>
  kind === 'fallback' || kind === 'iteration-fallback';

/**
 * Steps that appear before `currentStepName` in document order (depth-first), leaving out the
 * other branches of the steps it sits in (the other arm of an `if`, other cases, other parallel
 * branches), since those never run before it. Branches of steps that come before it stay, as
 * they may have run. Steps inside an `on-failure` or `iteration-on-failure` fallback keep the
 * body of the step that failed. Used by the data-reference picker Steps group.
 *
 * Known limit: this is document order only. It does not model `foreach.item` or branch-local
 * context, so nested scope can differ from what the runtime makes available.
 */
export const getDocumentOrderPredecessors = (
  steps: ReadonlyArray<unknown> | undefined,
  currentStepName: string
): readonly PrecedingStepRef[] => {
  if (!steps || !currentStepName) return [];
  const predecessors: PrecedingStepRef[] = [];
  let found = false;

  const visit = (list: ReadonlyArray<unknown>): void => {
    for (const item of list) {
      if (found) return;
      if (isStep(item)) {
        if (item.name === currentStepName) {
          found = true;
          return;
        }
        predecessors.push({ name: item.name, type: item.type });
        const ownEnd = predecessors.length;
        visitStepChildSlots(item, (slot, children) => {
          if (found) return;
          const listStart = predecessors.length;
          visit(children);
          // The current step is in this list, so the lists before it did not run.
          if (found && !isFallbackSlot(slot)) predecessors.splice(ownEnd, listStart - ownEnd);
        });
      }
    }
  };

  visit(steps);
  return predecessors;
};

/**
 * Every step in document order (depth-first). Used when the picker must scope
 * to the whole workflow (e.g. workflow output values evaluated after the run).
 */
export const getAllDocumentOrderSteps = (
  steps: ReadonlyArray<unknown> | undefined
): readonly PrecedingStepRef[] => {
  if (!steps) return [];
  const all: PrecedingStepRef[] = [];

  const visit = (list: ReadonlyArray<unknown>): void => {
    for (const item of list) {
      if (isStep(item)) {
        all.push({ name: item.name, type: item.type });
        visitStepChildSlots(item, (_slot, children) => visit(children));
      }
    }
  };

  visit(steps);
  return all;
};
