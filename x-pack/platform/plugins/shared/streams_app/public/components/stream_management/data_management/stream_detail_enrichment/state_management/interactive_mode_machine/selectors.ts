/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionBlock } from '@kbn/streamlang';
import { createSelector } from 'reselect';
import { isStepUnderEdit } from '../steps_state_machine';
import type { InteractiveModeContext } from './types';

/**
 * Selects the processor definition from the draft step (the new step currently being edited).
 * Returns undefined if no draft step exists.
 *
 * NOTE: This returns the processor *definition* directly (or undefined), NOT a wrapper object.
 * Returning a bare value instead of `{ processor }` avoids creating a new object reference
 * on every XState state change, which would bust React's selector memoization and cause
 * expensive re-renders of the entire preview table on every keystroke.
 */
export const selectDraftProcessorDefinition = (context: InteractiveModeContext) => {
  const draft = context.stepRefs.find((stepRef) => {
    const snapshot = stepRef.getSnapshot();
    return (
      isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot) && snapshot.context.isNew
    );
  });

  const snapshot = draft?.getSnapshot();

  return draft && snapshot && isActionBlock(snapshot.context.step)
    ? snapshot.context.step
    : undefined;
};

/**
 * Selects whether there are any new processors before the persisted ones.
 */
export const selectWhetherAnyProcessorBeforePersisted = createSelector(
  [(context: InteractiveModeContext) => context.stepRefs],
  (processorsRefs) => {
    return processorsRefs
      .map((ref) => ref.getSnapshot())
      .some((snapshot, id, processorSnapshots) => {
        // Skip if this processor is already persisted
        if (!snapshot.context.isNew) return false;

        // Check if there are persisted processors after this position
        const hasPersistedAfter = processorSnapshots
          .slice(id + 1)
          .some(({ context }) => !context.isNew);

        return hasPersistedAfter;
      });
  }
);

export const stepUnderEditSelector = (context: InteractiveModeContext) => {
  const underEdit = context.stepRefs.find((stepRef) => isStepUnderEdit(stepRef.getSnapshot()));
  return underEdit ? underEdit.getSnapshot().context.step : undefined;
};
