/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

interface StepRef<Step> {
  getSnapshot: () => { context: { step: Step } };
}

/** The `getDescendantIds` prop of `DraggableStepWrapper` for one step of a nested list. */
export const useDescendantIdsGetter = <Step>(
  stepRefs: ReadonlyArray<StepRef<Step>>,
  stepId: string,
  collectDescendantIds: (steps: Step[], parentId: string) => Set<string>
): (() => readonly string[]) =>
  useCallback(
    () =>
      Array.from(
        collectDescendantIds(
          stepRefs.map((ref) => ref.getSnapshot().context.step),
          stepId
        )
      ),
    [stepRefs, stepId, collectDescendantIds]
  );
