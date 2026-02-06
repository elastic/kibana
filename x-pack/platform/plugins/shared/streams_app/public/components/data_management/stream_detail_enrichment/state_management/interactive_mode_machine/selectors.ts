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
 * Selects the processor marked as the draft processor.
 */
export const selectDraftProcessor = (context: InteractiveModeContext) => {
  const draft = context.stepRefs.find((stepRef) => {
    const snapshot = stepRef.getSnapshot();
    return (
      isActionBlock(snapshot.context.step) && isStepUnderEdit(snapshot) && snapshot.context.isNew
    );
  });

  const snapshot = draft?.getSnapshot();

  return draft && isActionBlock(snapshot?.context.step)
    ? {
        processor: snapshot?.context.step,
      }
    : {
        processor: undefined,
      };
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
